import { type PlatformAccessory, type Service } from 'homebridge';
import type { AirthingsWavePlatform } from './platform.js';
import packageJson from '../package.json' with { type: 'json' };
import { AirthingsWaveSensor, waveSensor } from './airthingsWave.ts';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class AirthingsWaveAccessory {
  private name: string;
  private isWavePlus: boolean;
  private name_temperature: string;
  private name_humidity: string;
  private name_CO2?: string = '';
  private refresh: number;
  private address: string;
  private temperatureService: Service;
  private humidityService: Service;
  private carbonDioxideService?: Service;

  // The device information from the config file comes in with the accessory.context.device
  constructor(
    private readonly platform: AirthingsWavePlatform,
    private readonly accessory: PlatformAccessory,
  ) {
    // Get information from the config file about the device
    this.name = accessory.context.device.name;
    this.isWavePlus = accessory.context.device.waveplus || false;
    this.name_temperature = accessory.context.device.name_temperature || this.name;
    this.name_humidity = accessory.context.device.name_humidity || this.name;
    this.refresh = accessory.context.device.refresh || 3600; // Update every hour
    this.address = accessory.context.device.address;
    this.devicePolling.bind(this);

    // Set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Airthings')
      .setCharacteristic(this.platform.Characteristic.Model, this.isWavePlus ? 'Wave+' : 'Wave')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.address)
      .setCharacteristic(this.platform.Characteristic.FirmwareRevision, packageJson.version);

    // Add the sensors, we are skipping this unique identifier, let's see if that is OK
    this.humidityService = this.accessory.getService(this.name_humidity)
      || this.accessory.addService(this.platform.Service.HumiditySensor, this.name_humidity);

    this.temperatureService = this.accessory.getService(this.name_temperature)
      || this.accessory.addService(this.platform.Service.TemperatureSensor, this.name_temperature);
    
    const RDSTA = this.platform.customCharacteristic.characteristic.RadonShortTermAverage.name;
    const RDLTA = this.platform.customCharacteristic.characteristic.RadonLongTermAverage.name;
    
    if (!this.temperatureService.testCharacteristic(RDSTA)) {
      this.temperatureService.addCharacteristic(this.platform.customCharacteristic.characteristic.RadonShortTermAverage);
    }
    if (!this.temperatureService.testCharacteristic(RDLTA)) {
      this.temperatureService.addCharacteristic(this.platform.customCharacteristic.characteristic.RadonLongTermAverage);
    }
    
    this.platform.log.debug('Finished adding humidity, temperature, and radon');
    
    // If we have Wave+ then we have additional services/characteristics
    if(this.isWavePlus) {
      this.name_CO2 = accessory.context.device.name_CO2 || this.name;
      this.carbonDioxideService = this.accessory.getService(this.name_CO2!)
      || this.accessory.addService(this.platform.Service.CarbonDioxideSensor, this.name_CO2);
      this.carbonDioxideService
        .getCharacteristic(this.platform.Characteristic.CarbonDioxideLevel)
        .setProps({
          minValue: 0,
          maxValue: 5000,
          minStep: 1,
        });
      const VOCL = this.platform.customCharacteristic.characteristic.VOC_Level.UUID;
      const PR = this.platform.customCharacteristic.characteristic.Pressure.UUID;

      if(!this.carbonDioxideService.testCharacteristic(VOCL)) {
        this.carbonDioxideService.addCharacteristic(this.platform.customCharacteristic.characteristic.VOC_Level, this.name_CO2);
      }
      if(!this.carbonDioxideService.testCharacteristic(PR)) {
        this.carbonDioxideService.addCharacteristic(this.platform.customCharacteristic.characteristic.Pressure, this.name_CO2);
      }
      this.platform.log.debug('Finished adding CO2, VOC, and pressure');
    }

    // Get the initial value of the sensors so we don't have to wait the first interval
    this.devicePolling();
    // Now setup the interval polling
    setInterval(this.devicePolling.bind(this), this.refresh * 1000);
  }

  async devicePolling() {
    const airthingswave = new AirthingsWaveSensor(this.platform, this.address, this.isWavePlus);
    
    this.platform.log.debug('Polling device: ', this.name, ' at address: ', this.address);
    this.platform.log.debug('Wave+ device: ', this.isWavePlus);
    this.platform.log.debug('Refresh interval: ', this.refresh, ' seconds');

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

      this.carbonDioxideService?.setCharacteristic(
        this.platform.Characteristic.CarbonDioxideLevel, airthingswave.getvalue(waveSensor.co2Level));
      this.carbonDioxideService?.setCharacteristic(
        this.platform.customCharacteristic.characteristic.VOC_Level, airthingswave.getvalue(waveSensor.vocLevel));
      this.carbonDioxideService?.setCharacteristic(
        this.platform.customCharacteristic.characteristic.Pressure, airthingswave.getvalue(waveSensor.pressure));
      
    }
  }

  getServices() {
    if(this.isWavePlus) {
      return [this.temperatureService, this.humidityService, this.carbonDioxideService];
    } else {
      return [this.temperatureService, this.humidityService];
    }
  }
}
