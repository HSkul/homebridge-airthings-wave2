////////////////////////////////////////////////////////////////////////////////////////
// Custom Characteristics for use with Airthing Wave/Wave+ radon detector
////////////////////////////////////////////////////////////////////////////////////////

import { API, Characteristic, Formats, Perms } from 'homebridge';

export function createRadonLTACharacteristics(api: API): typeof Characteristic {
  return class RadonLongTermAverage extends api.hap.Characteristic {
    public static readonly UUID: string = 'B42E0A4C-ADE7-11E4-89D3-123B93F75CBA';
    constructor() {
      super('RadonLongTermAverage', RadonLongTermAverage.UUID, {
        format: Formats.UINT16,
        perms: [Perms.PAIRED_READ, Perms.NOTIFY],
        minValue: 0,
        maxValue: 1000,
        minStep: 1,
        unit: 'Bq/m3',
      });
      this.value = this.getDefaultValue();
    }
  };
}

export function createRadonSTACharacteristics(api: API): typeof Characteristic {
  return class RadonShortTermAverage extends api.hap.Characteristic {
    public static readonly UUID: string = 'B42E01AA-ADE7-11E4-89D3-123B93F75CBA';
    constructor() {
      super('RadonShortTermAverage', RadonShortTermAverage.UUID, {
        format: Formats.UINT16,
        perms: [Perms.PAIRED_READ, Perms.NOTIFY],
        minValue: 0,
        maxValue: 1000,
        minStep: 1,
        unit: 'Bq/m3',
      });
      this.value = this.getDefaultValue();
    }
  };
}

export function createVOCCharacteristics(api: API): typeof Characteristic {
  return class VOC_Level extends api.hap.Characteristic {
    public static readonly UUID: string = 'B42E41C4-ADE7-11E4-89D3-123B93F75CBA';
    constructor() {
      super('VOC_Level', VOC_Level.UUID, {
        format: Formats.FLOAT,
        perms: [Perms.PAIRED_READ, Perms.NOTIFY],
        minValue: 0,
        maxValue: 5000,
        minStep: 1,
        unit: 'ppb',
      });
      this.value = this.getDefaultValue();
    }
  };
}

export function createPressureCharacteristics(api: API): typeof Characteristic {
  return class Pressure extends api.hap.Characteristic {
    public static readonly UUID: string = '873AE82A-4C5A-4342-B539-9D900BF7EBD0';
    constructor() {
      super('Pressure', Pressure.UUID, {
        format: Formats.UINT16,
        perms: [Perms.PAIRED_READ, Perms.NOTIFY],
        minValue: 0,
        maxValue: 1200,
        minStep: 1,
        unit: 'hPa',
      });
      this.value = this.getDefaultValue();
    }
  };
}

