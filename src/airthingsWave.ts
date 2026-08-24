// Create bluetooth adapter instance
import { Logging } from 'homebridge';
//import { createBluetooth, Adapter, Device, GattServer } from 'node-ble';
import { createBluetooth, Device } from 'node-ble';
import { AirthingsWavePlatform } from './platform.ts';
//import { waveSensor } from './types.ts';


// Orders of values in the array
//const SENSOR_IDX_HUMIDITY = 0;
//const SENSOR_IDX_TEMPERATURE = 1;
//const SENSOR_IDX_RADON_SHORT_TERM_AVG = 2;
//const SENSOR_IDX_RADON_LONG_TERM_AVG = 3;
//const SENSOR_IDX_REL_ATM_PRESSURE = 4;
//const SENSOR_IDX_CO2_LVL = 5;
//const SENSOR_IDX_VOC_LVL = 6;

export enum waveSensor {
  humidity = 0,
  temperature = 1,
  radonShortTermAverage = 2,
  radonLongTermAverage = 3,
  pressure = 4,
  co2Level = 5,
  vocLevel = 6
}

export class AirthingsWaveSensor {
  public log: Logging;
  private sensor_uuid: string[];
  private primaryservice_uuid: string[];
  // 0: Wave, 1: Wave+
  // Use as: primaryservice_uuid[number(this.isWavePlus)]
  private macaddr: string;
  private sensor_version: number;
  private sensor_data: number[];
  private sensor_units: string[];
  private number_of_sensors: number;
  private isWavePlus: boolean;
 
  constructor(
    private readonly platform: AirthingsWavePlatform,
    private readonly btaddress: string, 
    private readonly plus: boolean,
  ) {
    this.macaddr = btaddress.toLowerCase();
    this.isWavePlus = plus;
    // [0] = Wave, [1] = Wave+
    this.primaryservice_uuid = ['b42e1f6e-ade7-11e4-89d3-123b93f75cba', 'b42e1c08-ade7-11e4-89d3-123b93f75cba'];
    
    // Set the number of sensors depending on the type of wave
    this.number_of_sensors = this.isWavePlus ? 7 : 4;
    // These UUIDs are only for Wave, since Wave+ has a single UUID for all the characteristics
    this.sensor_uuid = new Array(4).fill(null);
    this.sensor_uuid[waveSensor.humidity] = '00002a6f-0000-1000-8000-00805f9b34fb';
    this.sensor_uuid[waveSensor.temperature] = '00002a6e-0000-1000-8000-00805f9b34fb';
    this.sensor_uuid[waveSensor.radonShortTermAverage] = 'B42E01AA-ADE7-11E4-89D3-123B93F75CBA';
    this.sensor_uuid[waveSensor.radonLongTermAverage] = 'B42E0A4C-ADE7-11E4-89D3-123B93F75CBA';
    // Where sensor data is actually stored
    this.sensor_data = new Array(this.number_of_sensors).fill(0);
    this.sensor_units = ['%rH', 'degC', 'Bq/m3', 'Bq/m3', 'hPa', 'ppm', 'ppb'];
    this.sensor_version = -1;
    this.log = platform.log;
  }

  // There is just a single readWave() function that connects and reads dataand inside it
  // we will check if it is a wave or wave+ and then read the appropriate characteristics

  async readWave() {
    const { bluetooth, destroy } = createBluetooth();
    let device: Device | undefined = undefined;
    try {
      const adapter = await bluetooth.defaultAdapter();
      // Start discovery of bluetooth devices
      if (! await adapter.isDiscovering()) {
        await adapter.startDiscovery();
      }
      // Wait for the device to be discovered
      //const
      device = await adapter.waitDevice(this.macaddr);  
      // Wait for the device to be connected
      await device.connect();
      
      this.log.debug('Connected to device');
      // Let's ensure we have the right device
      const deviceName = await device.getName();
      const btaddress = await device.getAddress();
      if (this.isWavePlus && deviceName !== 'Airthings Wave+') {
        this.log.error('ERROR: ',btaddress, 'is not a Wave+ device. Found device name: ', deviceName);
        //await device.disconnect();
        //destroy();
        return;
      } else if (!this.isWavePlus && deviceName !== 'AT#129408-2900Radon') {
        this.log.error('ERROR: ',btaddress, 'is not a Wave device. Found device name: ', deviceName);
        //await device.disconnect();
        //destroy();
        return;
      }

      // Get the generic attribute profile server for the device
      const gattServer = await device.gatt();
    
      // Get the primary service for the device, depending on whether it is a Wave or Wave+
      const service = await gattServer.getPrimaryService(this.primaryservice_uuid[Number(this.isWavePlus)]);
      this.log.info('Connected to device: ', deviceName, ' at address: ', btaddress);
      // Now the code depends on the type of wave, since Wave+ reads all values in one read, 
      // while Wave reads each characteristic separately.  So we will have to check the type of wave and read accordingly


      if (this.isWavePlus) {
        // Read from a Wave+
        this.log.info('Reading from Wave+ device: ', deviceName, ' at address: ', btaddress);
        const btcharacteristic = await service.getCharacteristic('b42e2fc2-ade7-11e4-89d3-123b93f75cba');
        const rawdata = await btcharacteristic.readValue();

        if (rawdata.length < 20) {
          this.log.error('ERROR: Received data length for Wave+ is too short!');
          //await device.disconnect();
          //destroy();
          return;
        }
        // Unpack data according to '<BBBBHHHHHHHH'
        // '<' little-endian
        // B = uint8, H = uint16
        // Buffer layout: 4 bytes (B), 8 bytes (H*6)

        const rawValues = [
          rawdata.readUInt8(0),
          rawdata.readUInt8(1),
          rawdata.readUInt8(2),
          rawdata.readUInt8(3),
          rawdata.readUInt16LE(4),
          rawdata.readUInt16LE(6),
          rawdata.readUInt16LE(8),
          rawdata.readUInt16LE(10),
          rawdata.readUInt16LE(12),
          rawdata.readUInt16LE(14),
          rawdata.readUInt16LE(16),
          rawdata.readUInt16LE(18),
        ];
        this.sensor_version = rawValues[0];
        if (this.sensor_version === 1) {
          this.sensor_data[waveSensor.humidity] = rawValues[1] / 2.0;
          this.sensor_data[waveSensor.temperature] = rawValues[6] / 100.0;
          this.sensor_data[waveSensor.radonShortTermAverage] = this.conv2radon(rawValues[4]);
          this.sensor_data[waveSensor.radonLongTermAverage] = this.conv2radon(rawValues[5]);
          this.sensor_data[waveSensor.pressure] = rawValues[7] / 50.0;
          this.sensor_data[waveSensor.co2Level] = rawValues[8] * 1.0;
          this.sensor_data[waveSensor.vocLevel] = rawValues[9] * 1.0;
        } else {
          this.log.error('ERROR: This doesn\'t seem to be supported Wave+ version.\n');
          //await device.disconnect();
          //destroy();
          return;
        }
      } else {
        // Read from a Wave
        this.log.info('Reading from Wave device: ', deviceName, ' at address: ', btaddress);
        // Temperature from Wave
        let btcharacteristic = await service.getCharacteristic(this.sensor_uuid[waveSensor.temperature]);
        let rawdata = await btcharacteristic.readValue();
        let rawValue = rawdata.readUInt16LE();
        this.sensor_data[waveSensor.temperature] = rawValue / 100.0;

        // Humidity from Wave
        btcharacteristic = await service.getCharacteristic(this.sensor_uuid[waveSensor.humidity]);
        rawdata = await btcharacteristic.readValue();
        rawValue = rawdata.readUInt16LE();
        this.sensor_data[waveSensor.humidity] = rawValue / 100.0;
  
        // Radon short term average from Wave
        btcharacteristic = await service.getCharacteristic(this.sensor_uuid[waveSensor.radonShortTermAverage]);
        rawdata = await btcharacteristic.readValue();
        rawValue = rawdata.readUInt16LE();
        this.sensor_data[waveSensor.radonShortTermAverage] = this.conv2radon(rawValue);

        // Radon long term average from Wave
        btcharacteristic = await service.getCharacteristic(this.sensor_uuid[waveSensor.radonLongTermAverage]);
        rawdata = await btcharacteristic.readValue();
        rawValue = rawdata.readUInt16LE();
        this.sensor_data[waveSensor.radonLongTermAverage] = this.conv2radon(rawValue);

      }
      this.log.info('Humidity: ', this.sensor_data[waveSensor.humidity], this.sensor_units[waveSensor.humidity]);
      this.log.info('Temperature: ', this.sensor_data[waveSensor.temperature], this.sensor_units[waveSensor.temperature]);
      this.log.info('Radon short term average: ', this.sensor_data[waveSensor.radonShortTermAverage], this.sensor_units[waveSensor.radonShortTermAverage]);
      this.log.info('Radon long term average: ', this.sensor_data[waveSensor.radonLongTermAverage], this.sensor_units[waveSensor.radonLongTermAverage]);
      if(this.isWavePlus) {
        this.log.info('Pressure: ', this.sensor_data[waveSensor.pressure], this.sensor_units[waveSensor.pressure]);
        this.log.info('CO2 level: ', this.sensor_data[waveSensor.co2Level], this.sensor_units[waveSensor.co2Level]);
        this.log.info('VOC level: ', this.sensor_data[waveSensor.vocLevel], this.sensor_units[waveSensor.vocLevel]);
      }

    } catch (error: unknown) {
      // Generic BLE error
      if (error instanceof Error) {
        this.log.error(`BLE Operation Failed: ${error.message}`);
        // Timeout probably means it didn't find the device
        if (error.message.includes('timed.out.Timeout')) {
          this.log.error('Did not find device at address: ', this.macaddr)
          // Handle other BlueZ rejections
        } else if (error.message.includes('org.bluez.Error.Failed')) {
          this.log.error('Is bluetooth setup properly?');
        } else {
          this.log.error('An unexpected error occurred:', error);
        }
      }
    } finally {
      // Clean up connections and DBus paths
      if (device && await device.isConnected()) {
        await device.disconnect();
      }
      // Free up DBus network connection
      destroy(); 
    }
  }

  getvalue(sensor_index: number): number {
    return this.sensor_data[sensor_index];
  }

  getunit(sensor_index: number): string {
    return this.sensor_units[sensor_index];
  }

  conv2radon(radon_raw: number) {
    let radon = -1; // Either invalid measurement, or not available
    if (radon_raw >= 0 && radon_raw <= 16383) {
      radon = radon_raw * 1.0;
    }
    return radon;
  }
}
