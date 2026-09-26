import { type PlatformAccessory, type Service } from 'homebridge';
import type { AirthingsWavePlatform } from './platform.js';
import packageJson from '../package.json' with { type: 'json' };
import { AirthingsWaveSensor, WaveSensor, WaveType } from './airthingsWave.ts';
import { createRadonLTACharacteristics, createRadonSTACharacteristics } from './customCharacteristics.js';
import { createVOCCharacteristics, createPressureCharacteristics } from './customCharacteristics.js';

/**
 * Platform Accessory
 * An instance of this class is created for each Wave device in the config file
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

  private radonShortTermAverageCharacteristic: ReturnType<typeof createRadonSTACharacteristics>;
  private radonLongTermAverageCharacteristic: ReturnType<typeof createRadonLTACharacteristics>;
  private vocLevelCharacteristic?: ReturnType<typeof createVOCCharacteristics>;
  private pressureCharacteristic?: ReturnType<typeof createPressureCharacteristics>;

  private temperatureService: Service;
  private humidityService: Service;
  private carbonDioxideService?: Service;
  private airthingswave!: AirthingsWaveSensor;

  // The device information from the config file comes in with the accessory.context.devices
  constructor(
    private readonly platform: AirthingsWavePlatform,
    private readonly accessory: PlatformAccessory,
  ) {
    // Get information from the config file about the device
    this.name = accessory.context.device.name;
    
    this.name_temperature = accessory.context.device.name_temperature || this.name;
    this.name_humidity = accessory.context.device.name_humidity || this.name;
    this.refresh = accessory.context.device.refresh || 3600; // Update every hour
    this.address = accessory.context.device.address;
    
    this.radonShortTermAverageCharacteristic = createRadonSTACharacteristics(this.platform.api);
    this.radonLongTermAverageCharacteristic = createRadonLTACharacteristics(this.platform.api);
    this.vocLevelCharacteristic = undefined;
    this.pressureCharacteristic = undefined;
   
    this.isWavePlus = false; // We will determine this later when we read the device info
    
    this.platform.log.debug('AirthingsWaveAccessory constructor called for device: ', this.name, ' at address: ', this.address);
    
    // Set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Airthings')
    //  .setCharacteristic(this.platform.Characteristic.Model, this.isWavePlus ? 'Wave+' : 'Wave')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.address)
      .setCharacteristic(this.platform.Characteristic.FirmwareRevision, packageJson.version);

    // Add the sensors, we are skipping this unique identifier, let's see if that is OK
    this.humidityService = this.accessory.getService(this.name_humidity)
      || this.accessory.addService(this.platform.Service.HumiditySensor, this.name_humidity);

    this.temperatureService = this.accessory.getService(this.name_temperature)
      || this.accessory.addService(this.platform.Service.TemperatureSensor, this.name_temperature);
    
    if (!this.temperatureService.testCharacteristic(this.radonShortTermAverageCharacteristic.name)) {
      this.temperatureService.addCharacteristic(this.radonShortTermAverageCharacteristic);
    }
    if (!this.temperatureService.testCharacteristic(this.radonLongTermAverageCharacteristic.name)) {
      this.temperatureService.addCharacteristic(this.radonLongTermAverageCharacteristic);
    }
    this.platform.log.debug('Finished adding humidity, temperature, and radon');
  }

  public async init( accessory: PlatformAccessory ): Promise<void> {
    this.platform.log.debug('AirthingsWaveAccessory init() called for device: ', this.name, ' at address: ', this.address);
    this.airthingswave = new AirthingsWaveSensor(this.platform, this.address);
    if (await this.airthingswave.connectWave()) {
      await this.airthingswave.readWaveInfo();
      await this.airthingswave.disconnectWave();
    }
    this.isWavePlus = this.airthingswave.wave_type === WaveType.wavePlus;
    // Now we can set the model characteristic based on the device type
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Model, this.isWavePlus ? 'Wave+' : 'Wave');
    
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
  
      this.vocLevelCharacteristic = createVOCCharacteristics(this.platform.api);
      this.pressureCharacteristic = createPressureCharacteristics(this.platform.api);

      if(!this.carbonDioxideService.testCharacteristic(this.vocLevelCharacteristic.name)) {
        this.carbonDioxideService.addCharacteristic(this.vocLevelCharacteristic, this.name_CO2);
      }
      if(!this.carbonDioxideService.testCharacteristic(this.pressureCharacteristic.name)) {
        this.carbonDioxideService.addCharacteristic(this.pressureCharacteristic, this.name_CO2);
      }
      this.platform.log.debug('Finished adding CO2, VOC, and pressure');
    }

    // Get the initial value of the sensors so we don't have to wait the first interval
    this.devicePolling();
    // Now setup the interval polling
    setInterval(this.devicePolling.bind(this), this.refresh * 1000);
  }

  async devicePolling(): Promise<void> {
    this.platform.log.debug('Polling device: ', this.name, ' at address: ', this.address);
    this.platform.log.debug('Wave+ device: ', this.isWavePlus);
    this.platform.log.debug('Refresh interval: ', this.refresh, ' seconds');

    await this.airthingswave.connectWave();
    await this.airthingswave.readWaveData();
    await this.airthingswave.disconnectWave();

    /*this.platform.log
      .info('Humidity: ', this.airthingswave.getvalue(WaveSensor.humidity), this.airthingswave.getunit(WaveSensor.humidity));
    this.platform.log
      .info('Temperature: ', this.airthingswave.getvalue(WaveSensor.temperature), this.airthingswave.getunit(WaveSensor.temperature));
    this.platform.log
      .info('Radon short term: ', this.airthingswave.getvalue(WaveSensor.radonShortTermAverage), this.airthingswave.getunit(WaveSensor.radonShortTermAverage));
    this.platform.log
      .info('Radon long term: ', this.airthingswave.getvalue(WaveSensor.radonLongTermAverage), this.airthingswave.getunit(WaveSensor.radonLongTermAverage));
*/
    this.humidityService
      .setCharacteristic(this.platform.Characteristic.CurrentRelativeHumidity, this.airthingswave.getvalue(WaveSensor.humidity));
    this.temperatureService
      .setCharacteristic(this.platform.Characteristic.CurrentTemperature, this.airthingswave.getvalue(WaveSensor.temperature));
    this.temperatureService
      .setCharacteristic(this.radonShortTermAverageCharacteristic.name, this.airthingswave.getvalue(WaveSensor.radonShortTermAverage));
    this.temperatureService
      .setCharacteristic(this.radonLongTermAverageCharacteristic.name, this.airthingswave.getvalue(WaveSensor.radonLongTermAverage));

    if (this.isWavePlus) {
      //this.platform.log.info('Pressure: ', this.airthingswave.getvalue(WaveSensor.pressure), this.airthingswave.getunit(WaveSensor.pressure));
      //this.platform.log.info('Carbon dioxide: ', this.airthingswave.getvalue(WaveSensor.co2Level), this.airthingswave.getunit(WaveSensor.co2Level));
      //this.platform.log.info('Organics: ', this.airthingswave.getvalue(WaveSensor.vocLevel), this.airthingswave.getunit(WaveSensor.vocLevel));

      this.carbonDioxideService?.setCharacteristic(
        this.platform.Characteristic.CarbonDioxideLevel, this.airthingswave.getvalue(WaveSensor.co2Level));
      this.carbonDioxideService?.setCharacteristic(
        this.vocLevelCharacteristic!.name, this.airthingswave.getvalue(WaveSensor.vocLevel));
      this.carbonDioxideService?.setCharacteristic(
        this.pressureCharacteristic!.name, this.airthingswave.getvalue(WaveSensor.pressure));
    }
  }

  getServices(): (Service | undefined)[] {
    if(this.isWavePlus) {
      return [this.temperatureService, this.humidityService, this.carbonDioxideService];
    } else {
      return [this.temperatureService, this.humidityService];
    }
  }
}
