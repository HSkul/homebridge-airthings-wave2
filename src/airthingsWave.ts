// Create bluetooth adapter instance
import { Logging } from 'homebridge';
import { createBluetooth, Device } from 'node-ble';
import { AirthingsWavePlatform } from './platform.ts';

export enum WaveSensor {
  humidity = 0,
  temperature = 1,
  radonShortTermAverage = 2,
  radonLongTermAverage = 3,
  pressure = 4,
  co2Level = 5,
  vocLevel = 6
}

export enum WaveType {
  none = -1,
  wave = 0,
  wavePlus = 1
}

export class AirthingsWaveSensor {
  public log: Logging;
  private macaddr: string;                // MAC address of the Wave
  private deviceName: string | undefined;// Name of the device
  public wave_type: number;              // Version of the Wave
  //private number_of_sensors: number;      // Number of sensors in the Wave (4 for Wave, 7 for Wave+)
  private sensor_data: number[];          // Array to hold the sensor data 
  private sensor_units: string[];         // Array to hold the sensor units
  private sensor_uuid: string[];          // Array to hold the sensor UUIDs (only for Wave, since Wave+ has a single UUID for all characteristics)
  private primaryservice_uuid: string[];  // Array to hold the primary service UUIDs for Wave and Wave+
  // 0: Wave, 1: Wave+
  // Use as: primaryservice_uuid[this.wave_type]
  private bluetooth: any;                   // Bluetooth adapter instance
  private adapter: any;                     // Bluetooth adapter instance
  private device: Device | undefined;       // Bluetooth device instance
  private gattServer: any;                  // GATT server instance
  private service: any;                     // GATT service instance
  //private btcharacteristic: any;            // Bluetooth characteristic instance


  constructor(
    private readonly platform: AirthingsWavePlatform,
    private readonly btaddress: string, 
    //private readonly plus: boolean,
  ) {
    this.macaddr = btaddress.toLowerCase();
    this.deviceName = '';
    // [0] = Wave, [1] = Wave+
    this.primaryservice_uuid = ['b42e1f6e-ade7-11e4-89d3-123b93f75cba', 'b42e1c08-ade7-11e4-89d3-123b93f75cba'];
    
    // Set the number of sensors depending on the type of wave
    //this.number_of_sensors = this.isWavePlus ? 7 : 4;
    // These UUIDs are only for Wave, since Wave+ has a single UUID for all the characteristics
    this.sensor_uuid = new Array(4).fill(null);
    this.sensor_uuid[WaveSensor.humidity] = '00002a6f-0000-1000-8000-00805f9b34fb';
    this.sensor_uuid[WaveSensor.temperature] = '00002a6e-0000-1000-8000-00805f9b34fb';
    this.sensor_uuid[WaveSensor.radonShortTermAverage] = 'b42e01aa-ade7-11e4-89d3-123b93f75cba';
    this.sensor_uuid[WaveSensor.radonLongTermAverage] = 'b42e0a4c-ade7-11e4-89d3-123b93f75cba';
    // Where sensor data is actually stored
    this.sensor_data = new Array<number>(7).fill(0);
    this.sensor_units = ['%rH', 'degC', 'Bq/m3', 'Bq/m3', 'hPa', 'ppm', 'ppb'];
    this.wave_type = WaveType.none;
    // wave_type is WaveType.wave for the original Wave, WaveType.wavePlus for Wave+, and WaveType.none for unknown
    // Other Wave types will have 2, 3, etc.  But we will only support Wave and Wave+ for now
    //-------------------------------
    this.bluetooth = null;
    this.adapter = null;
    this.device = undefined;
    this.gattServer = null;
    this.service = null;
    //this.btcharacteristic = null;
    
    this.log = platform.log;
    // Should connect to Wave here and determine the type, version, number of sensors, and name of device
    // This should be done in a separate function that is called from the constructor, and should be async, 
    // but since constructors cannot be async, we will have to call it from the platform.ts file after the 
    // constructor is called

    // readWaveInfo() should only read the device info and not update the sensor data
    // readWaveData() should read the sensor data and update the sensor_data array
  

  }

  // There is just a single readWave() function that connects and reads dataand inside it
  // we will check if it is a wave or wave+ and then read the appropriate characteristics

  async connecToWave() {
    const { bluetooth, destroy } = createBluetooth();
    this.bluetooth = bluetooth;
    try {
      this.adapter = await this.bluetooth.defaultAdapter();
      // Start discovery of bluetooth devices
      if (! await this.adapter.isDiscovering()) {
        await this.adapter.startDiscovery();
      }
      this.device = await this.adapter.waitDevice(this.macaddr);  
      // Wait for the device to be connected
      await this.device?.connect();
      this.log.debug('Connected to device');
    } catch (error: unknown) {
      // Generic BLE error
      if (error instanceof Error) {
        this.log.error(`BLE Operation Failed: ${error.message}`);
        // Timeout probably means it didn't find the device
        if (error.message.includes('timed out')) {
          this.log.error('Did not find device at address: ', this.macaddr);
          // Handle other BlueZ rejections
        } else if (error.message.includes('bluez')) {
          this.log.error('Is bluetooth setup properly?');
        } else {
          this.log.error('An unexpected error occurred:', error);
        }
      }
      if (this.device && await this.device.isConnected()) {
        await this.device.disconnect();
      }
      // Free up DBus network connection
      destroy();
    }
  }

  async readWaveInfo() {
    const { bluetooth, destroy } = createBluetooth();
    //this.bluetooth = bluetooth;
    //let device: Device | undefined = undefined;
    // Use a try-catch block to handle errors during the BLE operations
    try {
      //const adapter = await bluetooth.defaultAdapter();
      //this.adapter = await this.bluetooth.defaultAdapter();
      // Start discovery of bluetooth devices
      //if (! await this.adapter.isDiscovering()) {
      //  await this.adapter.startDiscovery();
      //}
      // Wait for the device to be discovered
      //device = await adapter.waitDevice(this.macaddr);  
      // Wait for the device to be connected
      //await device.connect();
      //this.log.debug('Connected to device');
      // Let's ensure we have the right device
      this.deviceName = await this.device?.getAlias();
      const btaddress = await this.device?.getAddress();
      // In the future, other wave devices may be added here
      switch (this.deviceName) {
      case 'Airthings Wave+':
        this.wave_type = WaveType.wavePlus;
        //this.number_of_sensors = 7;
        this.log.debug('Found Wave+ device: ', btaddress, ' with name: ', this.deviceName);
        break;
      case 'AT#129408-2900Radon':
        this.wave_type = WaveType.wave;
        //this.number_of_sensors = 4;
        this.log.debug('Found Wave device: ', btaddress, ' with name: ', this.deviceName);
        break;
      default:
        this.wave_type = WaveType.none;
        //this.number_of_sensors = 0;
        this.log.error('ERROR: ',btaddress, 'is not a Wave or Wave+ device. Found device name: ', this.deviceName);
        break;
      }
    } catch (error: unknown) {
      // Generic BLE error
      if (error instanceof Error) {
        this.log.error(`BLE Operation Failed: ${error.message}`);
        // Timeout probably means it didn't find the device
        if (error.message.includes('timed out')) {
          this.log.error('Did not find device at address: ', this.macaddr);
          // Handle other BlueZ rejections
        } else if (error.message.includes('bluez')) {
          this.log.error('Is bluetooth setup properly?');
        } else {
          this.log.error('An unexpected error occurred:', error);
        }
      }
      if (this.device && await this.device.isConnected()) {
        await this.device.disconnect();
      }
      // Free up DBus network connection
      destroy(); 
    } 
  }
  // This should only read the sensor data and update the sensor_data array, but not read the device info
  async readWaveData() {
    const { bluetooth, destroy } = createBluetooth();
    //let device: Device | undefined = undefined;

    // Let's make sure we found a wave device before we try to read data from it
    if (this.wave_type === WaveType.none) {
      this.log.error('ERROR: Cannot read data from device: ', this.macaddr, ' because it is not a Wave or Wave+ device.');
      return;
    }

    // Use a try-catch block to handle errors during the BLE operations
    try {
      //const adapter = await bluetooth.defaultAdapter();
      // Start discovery of bluetooth devices
      //if (! await adapter.isDiscovering()) {
      //  await adapter.startDiscovery();
      //}
      // Wait for the device to be discovered
      //device = await adapter.waitDevice(this.macaddr);  
      // Wait for the device to be connected
      //await device.connect();
      
      this.log.debug('Reading data from device: ', this.deviceName, ' at address: ', this.macaddr);
      // Let's ensure we have the right device
      //const deviceName = await device.getAlias();
      //const btaddress = await device.getAddress();
      //if (this.isWavePlus && deviceName !== 'Airthings Wave+') {
      //  this.log.error('ERROR: ',btaddress, 'is not a Wave+ device. Found device name: ', deviceName);
      //  //await device.disconnect();
      //  //destroy();
      //  return;
      //} else if (!this.isWavePlus && deviceName !== 'AT#129408-2900Radon') {
      //  this.log.error('ERROR: ',btaddress, 'is not a Wave device. Found device name: ', deviceName);
      //  //await device.disconnect();
      //  //destroy();
      //  return;
      //}

      // Get the generic attribute profile server for the device
      this.gattServer = await this.device?.gatt();
    
      // Get the primary service for the device, depending on whether it is a Wave or Wave+
      this.log.debug('UUID of this Wave primary service: ', this.primaryservice_uuid[this.wave_type]);

      this.service = await this.gattServer.getPrimaryService(this.primaryservice_uuid[this.wave_type]);
      //this.log.info('Connected to device: ', deviceName, ' at address: ', btaddress);
      
      // Now the code depends on the type of wave, since Wave+ reads all values in one read, 
      // while Wave reads each characteristic separately.  So we will have to check the type of wave and read accordingly
      // Eventually this might be rewritten as switch statement
      if (this.wave_type === WaveType.wavePlus) {
        // Read from a Wave+
        this.log.debug('Reading from Wave+ device: ', this.deviceName, ' at address: ', this.macaddr);
        const btcharacteristic = await this.service.getCharacteristic('b42e2a68-ade7-11e4-89d3-123b93f75cba');
        const rawdata = await btcharacteristic.readValue();

        if (rawdata.length < 20) {
          this.log.error('ERROR: Received data length for Wave+ is too short!');
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
        
        if (this.wave_type === rawValues[0]) {
          this.sensor_data[WaveSensor.humidity] = rawValues[1] / 2.0;
          this.sensor_data[WaveSensor.temperature] = rawValues[6] / 100.0;
          this.sensor_data[WaveSensor.radonShortTermAverage] = this.conv2radon(rawValues[4]);
          this.sensor_data[WaveSensor.radonLongTermAverage] = this.conv2radon(rawValues[5]);
          this.sensor_data[WaveSensor.pressure] = rawValues[7] / 50.0;
          this.sensor_data[WaveSensor.co2Level] = rawValues[8] * 1.0;
          this.sensor_data[WaveSensor.vocLevel] = rawValues[9] * 1.0;
        } else {
          this.log.error('ERROR: This doesn\'t seem to be supported Wave+ version.\n');
          //await device.disconnect();
          //destroy();
          return;
        }
      } else {
        // Read from a Wave
        this.log.debug('Reading from Wave device: ', this.deviceName, ' at address: ', this.macaddr);
        // Temperature from Wave
        let btcharacteristic = await this.service.getCharacteristic(this.sensor_uuid[WaveSensor.temperature]);
        let rawdata = await btcharacteristic.readValue();
        let rawValue = rawdata.readUInt16LE();
        this.sensor_data[WaveSensor.temperature] = rawValue / 100.0;

        // Humidity from Wave
        btcharacteristic = await this.service.getCharacteristic(this.sensor_uuid[WaveSensor.humidity]);
        rawdata = await btcharacteristic.readValue();
        rawValue = rawdata.readUInt16LE();
        this.sensor_data[WaveSensor.humidity] = rawValue / 100.0;
  
        // Radon short term average from Wave
        btcharacteristic = await this.service.getCharacteristic(this.sensor_uuid[WaveSensor.radonShortTermAverage]);
        rawdata = await btcharacteristic.readValue();
        rawValue = rawdata.readUInt16LE();
        this.sensor_data[WaveSensor.radonShortTermAverage] = this.conv2radon(rawValue);

        // Radon long term average from Wave
        btcharacteristic = await this.service.getCharacteristic(this.sensor_uuid[WaveSensor.radonLongTermAverage]);
        rawdata = await btcharacteristic.readValue();
        rawValue = rawdata.readUInt16LE();
        this.sensor_data[WaveSensor.radonLongTermAverage] = this.conv2radon(rawValue);

      }
      // Log the values read from the device
      this.log.info('Humidity: ', this.sensor_data[WaveSensor.humidity], this.sensor_units[WaveSensor.humidity]);
      this.log.info('Temperature: ', this.sensor_data[WaveSensor.temperature], this.sensor_units[WaveSensor.temperature]);
      this.log.info('Radon short term average: ', this.sensor_data[WaveSensor.radonShortTermAverage], this.sensor_units[WaveSensor.radonShortTermAverage]);
      this.log.info('Radon long term average: ', this.sensor_data[WaveSensor.radonLongTermAverage], this.sensor_units[WaveSensor.radonLongTermAverage]);
      if(this.wave_type === WaveType.wavePlus) {
        this.log.info('Pressure: ', this.sensor_data[WaveSensor.pressure], this.sensor_units[WaveSensor.pressure]);
        this.log.info('CO2 level: ', this.sensor_data[WaveSensor.co2Level], this.sensor_units[WaveSensor.co2Level]);
        this.log.info('VOC level: ', this.sensor_data[WaveSensor.vocLevel], this.sensor_units[WaveSensor.vocLevel]);
      }

    } catch (error: unknown) {
      // Generic BLE error
      if (error instanceof Error) {
        this.log.error(`BLE Operation Failed: ${error.message}`);
        // Timeout probably means it didn't find the device
        if (error.message.includes('timed out')) {
          this.log.error('Did not find device at address: ', this.macaddr);
          // Handle other BlueZ rejections
        } else if (error.message.includes('bluez')) {
          this.log.error('Is bluetooth setup properly?');
        } else {
          this.log.error('An unexpected error occurred:', error);
        }
      }
    } finally {
      // Clean up connections and DBus paths
      if (this.device && await this.device.isConnected()) {
        await this.device.disconnect();
      }
      // Free up DBus network connection
      destroy(); 
      // Give some time for the device to disconnect before the next read, otherwise it will fail
      //await this.sleep(10000);
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

  // Helper function that returns a Promise
  sleep = (ms: number): Promise<void> => {
    return new Promise((resolve) => setTimeout(resolve, ms));
  };
}

