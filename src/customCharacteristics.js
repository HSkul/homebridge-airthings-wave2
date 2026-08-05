////////////////////////////////////////////////////////////////////////////////////////
// Custom Characteristics for use with Airthing Wave/Wave+ radon detector
////////////////////////////////////////////////////////////////////////////////////////

import { API, Characteristic, CharacteristicProps, Formats, Perms, WithUUID } from 'homebridge';

export class CustomCharacteristic {

  private api: API;
  public characteristic: { [key: string]: WithUUID< { new(): Characteristic }> } = {};

  constructor(api: API) {
    this.api = api;

    this.createCharacteristics('RadonLongTermAverage', 'B42E0A4C-ADE7-11E4-89D3-123B93F75CBA', {
      format: Formats.UINT16,
      perms: [Perms.PAIRED_READ, Perms.NOTIFY],
      minValue: 0,
      maxValue: 1000,
      minStep: 1,
    }, 'Radon Long Term Average');

    this.createCharacteristics('RadonShortTermAverage', 'B42E01AA-ADE7-11E4-89D3-123B93F75CBA', {
      format: Formats.UINT16,
      perms: [Perms.PAIRED_READ, Perms.NOTIFY],
      minValue: 0,
      maxValue: 1000,
      minStep: 1,
    }, 'Radon Short Term Average');

    this.createCharacteristics('VOC_Level', 'B42E41C4-ADE7-11E4-89D3-123B93F75CBA', {
      format: Formats.FLOAT,
      perms: [Perms.PAIRED_READ, Perms.NOTIFY],
      minValue: 0,
      maxValue: 5000,
      minStep: 1,
    }, 'VOC Level');

    this.createCharacteristics('Pressure', '873AE82A-4C5A-4342-B539-9D900BF7EBD0', {
      format: Formats.UINT16,
      perms: [Perms.PAIRED_READ, Perms.NOTIFY],
      minValue: 0,
      maxValue: 1200,
      minStep: 1,
    }, 'Pressure');
  }

  private createCharacteristics(key: string, uuid: string, props: CharacteristicProps, displayName: string = key) {
    this.characteristic[key] = class extends this.api.hap.Characteristic {
      static readonly UUID: string = uuid;
      constructor() {
        super(displayName, uuid, props);
        this.value = this.getDefaultValue();
      }
    };
  }
}



