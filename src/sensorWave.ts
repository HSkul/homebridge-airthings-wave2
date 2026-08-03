
const NUMBER_OF_SENSORS = 4;
//const SENSOR_IDX_DATETIME = 0;
const SENSOR_IDX_HUMIDITY = 0;
const SENSOR_IDX_TEMPERATURE = 1;
const SENSOR_IDX_RADON_ST_AVG = 2;
const SENSOR_IDX_RADON_LT_AVG = 3;


// Create bluetooth adapter instance
import { createBluetooth } from 'node-ble';
const {bluetooth, destroy} = createBluetooth();




export class WaveSensor {
  private sensor_uuid: string[];
  private macaddr: string;
  private sensor_version: number;
  private sensor_data: number[];
  private sensor_units: string[];
  private adapter: any;
  private device: any;
  private gattServer: any;

  // we need the following declarations:
  // bluetooth adapter instance
  // bluetooth device instance
  // bluetooth characteristic instance
  // bluetooth service instance

  constructor(private readonly btaddress: string)
  {
    // we would have to set the number of sensors here depending on the type of wave
    this.macaddr = btaddress.toLowerCase();
    this.sensor_uuid = new Array(NUMBER_OF_SENSORS).fill(null);
    //this.sensor_uuid[SENSOR_IDX_DATETIME] = '0x2A08';
    this.sensor_uuid[SENSOR_IDX_HUMIDITY] = '0x2A6F';
    this.sensor_uuid[SENSOR_IDX_TEMPERATURE] = '0x2A6E';
    this.sensor_uuid[SENSOR_IDX_RADON_ST_AVG] = 'B42E01AA-ADE7-11E4-89D3-123B93F75CBA';
    this.sensor_uuid[SENSOR_IDX_RADON_LT_AVG] = 'B42E0A4C-ADE7-11E4-89D3-123B93F75CBA';
    this.sensor_data = new Array(NUMBER_OF_SENSORS).fill(null);
    this.sensor_units = ["%rH", "degC", "Bq/m3", "Bq/m3"];
    this.sensor_version = -1;
    
  }


  // We have two types of connect(), and read() functions, for each type of wave
  async connect()
  {
    // Create bluetooth adapter instance
    this.adapter = await bluetooth.defaultAdapter();
    // Start discovery of bluetooth devices
    if (! await this.adapter.isDiscovering())
      await this.adapter.startDiscovery();
    // Wait for the device to be discovered
    this.device = await this.adapter.waitDevice(this.macaddr);
    await this.device.connect();
    // Get the generic attribute profile server for the device
    //  this.gattServer = await this.device.gatt();

  }

// Need to connect
// Loop through the sensors or just read the sensors one after another
//  Read in the raw data
//  Transform raw data into actual values and place into sensor_data array
//  



  async read()
  {
    // 
    //const service = await this.gattServer.getPrimaryService(this.uuid);
    // Can we skip the uuid and get all the data like the Python script?
    // Otherwise we will have to have all the different UUIDs for each sensor and read them one by one
    //const btcharacteristic = await service.getCharacteristic('uuid');
    // We need to loop through the sensors and get each of the values
    const rawValues = new Array(NUMBER_OF_SENSORS).fill(null);

    for (let i = 0; i < NUMBER_OF_SENSORS; i++) {
      const btcharacteristic = await this.device.getCharacteristic(this.sensor_uuid[i]);
      const rawdata = await btcharacteristic.readValue();
      console.log(rawdata);
      console.log(rawdata.length);
      if (rawdata.length < 2) {
        console.error("ERROR: Received data length is too short.");
        //process.exit(1);
      }
      // Unpack data according to '<H'
      // '<' little-endian
      // H = uint16
      rawValues[i] = rawdata.readUInt16LE(0);
    }

    this.sensor_data[SENSOR_IDX_HUMIDITY] = rawValues[0] / 2.0;
    this.sensor_data[SENSOR_IDX_TEMPERATURE] = rawValues[1] / 100.0;
    this.sensor_data[SENSOR_IDX_RADON_ST_AVG] = this.conv2radon(rawValues[2]);
    this.sensor_data[SENSOR_IDX_RADON_LT_AVG] = this.conv2radon(rawValues[3]);
    
  /*
    const btcharacteristic = await service.getCharacteristic();
    const rawdata = await btcharacteristic.readValue();
    console.log(rawdata);
    console.log(rawdata.length);
    if (rawdata.length < 12) {
      console.error("ERROR: Received data length is too short.");
      //process.exit(1);
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
      rawdata.readUInt16LE(18)
    ];
    this.sensor_version = rawValues[0];
    if (this.sensor_version === 1) {
      this.sensor_data[SENSOR_IDX_HUMIDITY] = rawValues[1] / 2.0;
      this.sensor_data[SENSOR_IDX_RADON_SHORT_TERM_AVG] = this.conv2radon(rawValues[4]);
      this.sensor_data[SENSOR_IDX_RADON_LONG_TERM_AVG] = this.conv2radon(rawValues[5]);
      this.sensor_data[SENSOR_IDX_TEMPERATURE] = rawValues[6] / 100.0;
      this.sensor_data[SENSOR_IDX_REL_ATM_PRESSURE] = rawValues[7] / 50.0;
      this.sensor_data[SENSOR_IDX_CO2_LVL] = rawValues[8] * 1.0;
      this.sensor_data[SENSOR_IDX_VOC_LVL] = rawValues[9] * 1.0;
    } else {
            console.error("ERROR: Incompatible sensor version.\n");
            //process.exit(1);
    } */
    
  }

  async disconnect()
  {
    await this.device.disconnect()
    destroy()
  }

  getvalue(sensor_index: number): number
  {
    return this.sensor_data[sensor_index];
  }

  getunit(sensor_index: number): string
  {
    return this.sensor_units[sensor_index];
  }

  conv2radon(radon_raw: number) {
    let radon = -1; // Either invalid measurement, or not available
    if (radon_raw >= 0 && radon_raw <= 16383) {
      radon = radon_raw;
    }
    return radon;
    }
}
