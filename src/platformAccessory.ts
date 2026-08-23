import { type PlatformAccessory, type Service } from 'homebridge';
// import { Characteristic, type CharacteristicValue, type PlatformAccessory, type Service } from 'homebridge';
import type { AirthingsWavePlatform } from './platform.js';
//import { CustomCharacteristic } from './customCharacteristics.js';

import packageJson from '../package.json' with { type: 'json' };
import { AirthingsWaveSensor, waveSensor } from './airthingsWave.ts';
//import { waveSensor } from './types.ts';
//import { WaveSensor } from './sensorWave.ts';
//import { createBluetooth } from 'node-ble';
//const {bluetooth, destroy} = createBluetooth();
//const adapter = await bluetooth.defaultAdapter();

//const airthings_humidity = 0;
//const airthings_temperature = 1;
//const airthings_radon_st = 2;
//const airthings_radon_lt = 3;
//const airthings_pressure = 4;
//const airthings_CO2 = 5;
//const airthings_VOC = 6;

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class AirthingsWaveAccessory {
  //private service: Service;
  private name: string;
  private isWavePlus: boolean;
  private name_temperature: string;
  private name_humidity: string;
  private name_CO2?: string = '';
  //private name_airpressure: string;
  private refresh: number;
  private address: string;
  private temperatureService: Service;
  private humidityService: Service;
  private carbonDioxideService?: Service;
  //private airPressureService: Service;
  //private informationService: Service;


  /**
   * These are just used to create a working example
   * You should implement your own code to track the state of your accessory
   */ 
  /*
  private exampleStates = {
    On: false,
    Brightness: 100,
  };
  */

  // The device information from the config file comes in with the accessory.context.device
  constructor(
    private readonly platform: AirthingsWavePlatform,
    private readonly accessory: PlatformAccessory,
  ) {
    // get information from the config file about the device
    this.name = accessory.context.device.name;
    this.isWavePlus = accessory.context.device.waveplus || false;
    this.name_temperature = accessory.context.device.name_temperature || this.name;
    this.name_humidity = accessory.context.device.name_humidity || this.name;
    this.refresh = accessory.context.device.refresh || 3600; // Update every hour
    this.address = accessory.context.device.address;
    this.devicePolling.bind(this);

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Airthings')
      .setCharacteristic(this.platform.Characteristic.Model, this.isWavePlus ? 'Wave+' : 'Wave')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.address)
      .setCharacteristic(this.platform.Characteristic.FirmwareRevision, packageJson.version);

    // get the LightBulb service if it exists, otherwise create a new LightBulb service
    // you can create multiple services for each accessory
    /*
    if (accessory.context.device.CustomService) {
      // This is only required when using Custom Services and Characteristics not support by HomeKit
      this.service = this.accessory.getService(this.platform.CustomServices[accessory.context.device.CustomService]) ||
        this.accessory.addService(this.platform.CustomServices[accessory.context.device.CustomService]);
    } else {
      this.service = this.accessory.getService(this.platform.Service.Lightbulb) || this.accessory.addService(this.platform.Service.Lightbulb);
    }
    */
    // set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    //this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.exampleDisplayName);

    // each service must implement at-minimum the "required characteristics" for the given service type
    // see https://developers.homebridge.io/#/service/Lightbulb

    // register handlers for the On/Off Characteristic
    /*
    this.service.getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.setOn.bind(this)) // SET - bind to the `setOn` method below
      .onGet(this.getOn.bind(this)); // GET - bind to the `getOn` method below

    // register handlers for the Brightness Characteristic
    this.service.getCharacteristic(this.platform.Characteristic.Brightness)
      .onSet(this.setBrightness.bind(this)); // SET - bind to the `setBrightness` method below
    */
    /**
     * Creating multiple services of the same type.
     *
     * To avoid "Cannot add a Service with the same UUID another Service without also defining a unique 'subtype' property." error,
     * when creating multiple services of the same type, you need to use the following syntax to specify a name and subtype id:
     * this.accessory.getService('NAME') || this.accessory.addService(this.platform.Service.Lightbulb, 'NAME', 'USER_DEFINED_SUBTYPE_ID');
     *
     * The USER_DEFINED_SUBTYPE must be unique to the platform accessory (if you platform exposes multiple accessories, each accessory
     * can use the same subtype id.)
     */
    // Add the sensors, we are skipping this unique identifier, let's see if that is OK
    this.humidityService = this.accessory.getService(this.name_humidity)
      || this.accessory.addService(this.platform.Service.HumiditySensor, this.name_humidity);

    this.temperatureService = this.accessory.getService(this.name_temperature)
      || this.accessory.addService(this.platform.Service.TemperatureSensor, this.name_temperature);
    
    const RDSTA = 'Radon Short Term Average';
    const RDLTA = 'Radon Long Term Average';
    
    this.platform.log.debug('Does the temperature service have radon added: ', this.temperatureService.testCharacteristic(RDSTA));
    this.platform.log.debug('Does the temperature service have temperature: ', this.temperatureService.testCharacteristic(this.name_temperature));
    if (!this.temperatureService.testCharacteristic(RDSTA)) {
      this.temperatureService.addCharacteristic(this.platform.customCharacteristic.characteristic.RadonShortTermAverage);
      this.temperatureService.addCharacteristic(this.platform.customCharacteristic.characteristic.RadonLongTermAverage);
    }
    
    //this.temperatureService.addCharacteristic(this.platform.customCharacteristic.characteristic.RadonShortTermAverage, this.name_temperature);
    //this.temperatureService.addCharacteristic(this.platform.customCharacteristic.characteristic.RadonLongTermAverage, this.name_temperature);

    this.platform.log.debug('Finished adding humidity, temperature, and radon');
    //this.carbonDioxideService = this.accessory.getService(this.name_CO2);
    
   
    //
    // If we have Wave+ then we have additional services/characteristics
    if(this.isWavePlus) {
      this.name_CO2 = accessory.context.device.name_CO2 || this.name;
      this.carbonDioxideService = this.accessory.getService(this.name_CO2 || this.name)
      || this.accessory.addService(this.platform.Service.CarbonDioxideSensor, this.name_CO2);
      this.carbonDioxideService
        .getCharacteristic(this.platform.Characteristic.CarbonDioxideLevel)
        .setProps({
          minValue: 0,
          maxValue: 5000,
          minStep: 1,
        });
      this.carbonDioxideService.addCharacteristic(this.platform.customCharacteristic.characteristic.VOC_Level, this.name_CO2);
      this.carbonDioxideService.addCharacteristic(this.platform.customCharacteristic.characteristic.Pressure, this.name_CO2);
      this.platform.log.debug('Finished adding CO2, VOC, and pressure');
      //this.name_airpressure = AirthingsWavePlatform.config.name_airpressure || this.name;
      //const airPressureService = this.accessory.getService(this.name_airpressure)
      //|| this.accessory.addService(this.platform.Service.AirPressureSensor, this.name_airpressure);
    }
    // Get the initial value of the sensors so we don't have to wait the first interval
    this.devicePolling();
    // Now setup the interval polling
    setInterval(this.devicePolling.bind(this), this.refresh * 1000);

    // Example: add two "motion sensor" services to the accessory

    /*
    const motionSensorOneService = this.accessory.getService('Motion Sensor One Name')
      || this.accessory.addService(this.platform.Service.MotionSensor, 'Motion Sensor One Name', 'YourUniqueIdentifier-1');

    const motionSensorTwoService = this.accessory.getService('Motion Sensor Two Name')
      || this.accessory.addService(this.platform.Service.MotionSensor, 'Motion Sensor Two Name', 'YourUniqueIdentifier-2');
    */
    /**
     * Updating characteristics values asynchronously.
     *
     * Example showing how to update the state of a Characteristic asynchronously instead
     * of using the `on('get')` handlers.
     * Here we change update the motion sensor trigger states on and off every 10 seconds
     * the `updateCharacteristic` method.
     *
     */
    /*
    let motionDetected = false;
    setInterval(() => {
      // EXAMPLE - inverse the trigger
      motionDetected = !motionDetected;

      // push the new value to HomeKit
      motionSensorOneService.updateCharacteristic(this.platform.Characteristic.MotionDetected, motionDetected);
      motionSensorTwoService.updateCharacteristic(this.platform.Characteristic.MotionDetected, !motionDetected);

      this.platform.log.debug('Triggering motionSensorOneService:', motionDetected);
      this.platform.log.debug('Triggering motionSensorTwoService:', !motionDetected);
    }, 10000);
  */
  }

  async devicePolling() {
    //var strvalues
    //var valuest
    //const wavePlus = new WavePlusSensor(this.address);
    const airthingswave = new AirthingsWaveSensor(this.platform, this.address, this.isWavePlus);
    //let thisWave;
    //wavePlus = new WavePlusSensor(this.address);
    //wave = new WaveSensor(this.address);
    /*
    if (this.waveplus) {
      let sensor: WavePlusSensor;
      sensor = new WavePlusSensor(this.address);
    }
    else {
      //let sensor: WaveSensor;
      //sensor = new WaveSensor(this.address);
    } */

    //if (this.isWavePlus) {
    //  thisWave = wavePlus;
    //} else {
    //  thisWave = wave;
    //}
    this.platform.log.debug('Polling device: ', this.name, ' at address: ', this.address);
    this.platform.log.debug('Wave+ device: ', this.isWavePlus);
    this.platform.log.debug('Refresh interval: ', this.refresh, ' seconds');

    //airthingswave.connect();
    airthingswave.readWave();
    
    this.platform.log
      .info('Humidity: ', airthingswave.getvalue(waveSensor.humidity), airthingswave.getunit(waveSensor.humidity));
    this.platform.log
      .info('Temperature: ', airthingswave.getvalue(waveSensor.temperature), airthingswave.getunit(waveSensor.temperature));
    this.platform.log
      .info('Radon short term: ', airthingswave.getvalue(waveSensor.radonShortTermAverage), airthingswave.getunit(waveSensor.radonShortTermAverage));
    this.platform.log
      .info('Radon long term: ', airthingswave.getvalue(waveSensor.radonLongTermAverage), airthingswave.getunit(waveSensor.radonLongTermAverage));

    this.humidityService
      .setCharacteristic(this.platform.Characteristic.CurrentRelativeHumidity, airthingswave.getvalue(waveSensor.humidity));
    this.temperatureService
      .setCharacteristic(this.platform.Characteristic.CurrentTemperature, airthingswave.getvalue(waveSensor.temperature));
    this.temperatureService
      .setCharacteristic(this.platform.customCharacteristic.characteristic.RadonShortTermAverage, airthingswave.getvalue(waveSensor.radonShortTermAverage));
    this.temperatureService
      .setCharacteristic(this.platform.customCharacteristic.characteristic.RadonLongTermAverage, airthingswave.getvalue(waveSensor.radonLongTermAverage));
    

    if (this.isWavePlus) {
      this.platform.log.info('Pressure: ', airthingswave.getvalue(waveSensor.pressure), airthingswave.getunit(waveSensor.pressure));
      this.platform.log.info('Carbon dioxide: ', airthingswave.getvalue(waveSensor.co2Level), airthingswave.getunit(waveSensor.co2Level));
      this.platform.log.info('Organics: ', airthingswave.getvalue(waveSensor.vocLevel), airthingswave.getunit(waveSensor.vocLevel));

      //this.airPressureService
      //  .setCharacteristic(this.platform.Characteristic.CurrentAirPressure, airthingswave.getvalue(airthings_pressure));
      this.carbonDioxideService?.setCharacteristic(
        this.platform.Characteristic.CarbonDioxideLevel, airthingswave.getvalue(waveSensor.co2Level));
      this.carbonDioxideService?.setCharacteristic(
        this.platform.customCharacteristic.characteristic.VOC_Level, airthingswave.getvalue(waveSensor.vocLevel));
      this.carbonDioxideService?.setCharacteristic(
        this.platform.customCharacteristic.characteristic.Pressure, airthingswave.getvalue(waveSensor.pressure));
      
    }
    //airthingswave.disconnect();
    // Basic procedure is:
    // - Connect to the device
    // - Read in the values from the device
    // - If waveplus then read extra values
    // - update the homekit sensors with the values
    //===============================================
    // Create one new class, Waveplus
    // Contains the relevant information, UUID and macaddress
    // Contains array of values, where values sensor values
    // .connect()
    // .read()
    // .getvalue(valueID in array)
    // .disconnect()


    // Start discovery operation to find bluetooth devices
    /*
    if (! await adapter.isDiscovering())
      await adapter.startDiscovery()

    // Use the adapter instance in order to get a remote Bluetooth device, then connect 
    // and interact with the GATT (Generic Attribute Profile) server.
    const device = await adapter.waitDevice(this.address)
    await device.connect()
    const gattServer = await device.gatt()

    // Connect to the data service on the wave via specific UUID?
    const dataservice = await gattServer.getPrimaryService('b42e2a68-ade7-11e4-89d3-123b93f75cba')
    // Set the characteristic we want based on a UUID of that Characteristic
    const characteristic1 = await dataservice.getCharacteristic('uuid');
    
    const buffer = await characteristic1.readValue();
    






    var spawn = require("child_process").spawn;
    var pythonProcess = spawn('python',[this.path, this.address]);
    pythonProcess.stdout.on('data', (data) => {
      strvalues = data.toString('utf8');
      valuest = strvalues.split(' ');

      this.platform.log('Humidity: ',roundInt(valuest[airthings_humidity]));
      this.platform.log('Temperature: ',roundInt(valuest[airthings_temperature]));
      this.platform.log('Radon short term: ',roundInt(valuest[airthings_radon_st]));
      this.platform.log('Radon long term: ',roundInt(valuest[airthings_radon_lt]));
      if(this.isWavePlus) {
        this.platform.log('Pressure: ',roundInt(valuest[airthings_pressure]));
        this.platform.log('Carbon dioxide: ',roundInt(valuest[airthings_CO2]));
        this.platform.log('Organics: ',roundInt(valuest[airthings_VOC]));
      }

      this.humidityService
        .setCharacteristic(Characteristic.CurrentRelativeHumidity, roundInt(valuest[airthings_humidity]));
      this.temperatureService
        .setCharacteristic(Characteristic.CurrentTemperature, roundInt(valuest[airthings_temperature]));
      this.temperatureService
        .setCharacteristic(RadonShortTermAverage, roundInt(valuest[airthings_radon_st]));
      this.temperatureService
        .setCharacteristic(RadonLongTermAverage, roundInt(valuest[airthings_radon_lt]));
      if(this.waveplus) {
        this.airPressureService
          .setCharacteristic(Characteristic.CurrentAirPressure, roundInt(valuest[airthings_pressure]));
        this.carbonDioxideService
          .setCharacteristic(Characteristic.CarbonDioxideLevel, roundInt(valuest[airthings_CO2]));
        this.carbonDioxideService
          .setCharacteristic(VOC_Level, roundInt(valuest[airthings_VOC]));
      }
     }); */
  }
  getServices() {
    if(this.isWavePlus) {
      //return [this.informationService, this.temperatureService, this.humidityService, this.carbonDioxideService, this.airPressureService]
      return [this.temperatureService, this.humidityService, this.carbonDioxideService];
    } else {
      //return [this.informationService, this.temperatureService, this.humidityService]
      return [this.temperatureService, this.humidityService];
    }
  }
  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory, for example, turning on a Light bulb.
   */
  /*
  async setOn(value: CharacteristicValue) {
    // implement your own code to turn your device on/off
    this.exampleStates.On = value as boolean;

    this.platform.log.debug('Set Characteristic On ->', value);
  }
  */
  /**
   * Handle the "GET" requests from HomeKit
   * These are sent when HomeKit wants to know the current state of the accessory, for example, checking if a Light bulb is on.
   *
   * GET requests should return as fast as possible. A long delay here will result in
   * HomeKit being unresponsive and a bad user experience in general.
   *
   * If your device takes time to respond you should update the status of your device
   * asynchronously instead using the `updateCharacteristic` method instead.
   * In this case, you may decide not to implement `onGet` handlers, which may speed up
   * the responsiveness of your device in the Home app.

   * @example
   * this.service.updateCharacteristic(this.platform.Characteristic.On, true)
   */
  /*
  async getOn(): Promise<CharacteristicValue> {
    // implement your own code to check if the device is on
    const isOn = this.exampleStates.On;

    this.platform.log.debug('Get Characteristic On ->', isOn);

    // if you need to return an error to show the device as "Not Responding" in the Home app:
    // throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);

    return isOn;
  }
  */
  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory, for example, changing the Brightness
   */
  /*
  async setBrightness(value: CharacteristicValue) {
    // implement your own code to set the brightness
    this.exampleStates.Brightness = value as number;

    this.platform.log.debug('Set Characteristic Brightness -> ', value);
  }
  */
}
/*
function roundInt(string: any) {
  return Math.round(parseFloat(string) * 10) / 10;
}
*/
