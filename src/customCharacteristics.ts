////////////////////////////////////////////////////////////////////////////////////////
// Custom Characteristics for use with Airthing Wave/Wave+ radon detector
////////////////////////////////////////////////////////////////////////////////////////

import { API, Characteristic, Formats, Perms } from 'homebridge';

//type CustomCharacteristicConstructor = new () => Characteristic;
type CharacteristicClass = typeof Characteristic;

export function createRadonCharacteristics(api: API): {
  RadonLongTermAverage: CharacteristicClass;
  RadonShortTermAverage: CharacteristicClass;
} {
  class RadonLongTermAverage extends api.hap.Characteristic {
    public static readonly UUID: string = 'B42E0A4C-ADE7-11E4-89D3-123B93F75CBA';
    constructor() {
      super('RadonLongTermAverage', RadonLongTermAverage.UUID, {
        format: Formats.UINT16,
        perms: [Perms.PAIRED_READ, Perms.NOTIFY],
        minValue: 0,
        maxValue: 1000,
        minStep: 1,
        unit: "Bq/m3",
      });
      this.value = this.getDefaultValue();
    }
  }

  class RadonShortTermAverage extends api.hap.Characteristic {
    public static readonly UUID: string = 'B42E01AA-ADE7-11E4-89D3-123B93F75CBA';
    constructor() {
      super('RadonShortTermAverage', RadonShortTermAverage.UUID, {
        format: Formats.UINT16,
        perms: [Perms.PAIRED_READ, Perms.NOTIFY],
        minValue: 0,
        maxValue: 1000,
        minStep: 1,
        unit: "Bq/m3",
      });
      this.value = this.getDefaultValue();
    }
  }

  return { RadonLongTermAverage, RadonShortTermAverage };
}

export function createAirQualityCharacteristics(api: API): {
  VOC_Level: CharacteristicClass;
  Pressure: CharacteristicClass;
} {
  const Characteristic = api.hap.Characteristic;

  class VOC_Level extends Characteristic {
    public static readonly UUID: string = 'B42E41C4-ADE7-11E4-89D3-123B93F75CBA';
    constructor() {
      super('VOC_Level', VOC_Level.UUID, {
        format: Formats.FLOAT,
        perms: [Perms.PAIRED_READ, Perms.NOTIFY],
        minValue: 0,
        maxValue: 5000,
        minStep: 1,
        unit: "ppm",
      });
      this.value = this.getDefaultValue();
    }
  }

  class Pressure extends Characteristic {
    public static readonly UUID: string = '873AE82A-4C5A-4342-B539-9D900BF7EBD0';
    constructor() {
      super('Pressure', Pressure.UUID, {
        format: Formats.UINT16,
        perms: [Perms.PAIRED_READ, Perms.NOTIFY],
        minValue: 0,
        maxValue: 1200,
        minStep: 1,
        unit: "hPa",
      });
      this.value = this.getDefaultValue();
    }
  }

  return { VOC_Level, Pressure };
}

/*
export class RadonLongTermAverage extends Characteristic {
  public static readonly UUID: string = 'B42E0A4C-ADE7-11E4-89D3-123B93F75CBA';

  constructor() {
    super('Radon Long Term Average', RadonLongTermAverage.UUID, {
      format: Formats.UINT16,
      perms: [Perms.PAIRED_READ, Perms.NOTIFY],
      minValue: 0,
      maxValue: 1000,
      minStep: 1
    });
  }
}

export class RadonShortTermAverage extends Characteristic {
  public static readonly UUID: string = 'B42E01AA-ADE7-11E4-89D3-123B93F75CBA';

  constructor() {
    super('Radon Short Term Average', RadonShortTermAverage.UUID, {
      format: Formats.UINT16,
      perms: [Perms.PAIRED_READ, Perms.NOTIFY],
      minValue: 0,
      maxValue: 1000,
      minStep: 1
    });
  }
}

export class VOC_Level extends Characteristic {
  public static readonly UUID: string = 'B42E41C4-ADE7-11E4-89D3-123B93F75CBA';

  constructor() {
    super('VOC Level', VOC_Level.UUID, {
      format: Formats.FLOAT,
      perms: [Perms.PAIRED_READ, Perms.NOTIFY],
      minValue: 0,
      maxValue: 5000,
      minStep: 1
    });
  }
}

export class Pressure extends Characteristic {
  public static readonly UUID: string = '873AE82A-4C5A-4342-B539-9D900BF7EBD0';

  constructor() {
    super('Pressure', Pressure.UUID, {
      format: Formats.UINT16,
      perms: [Perms.PAIRED_READ, Perms.NOTIFY],
      minValue: 0,
      maxValue: 1200,
      minStep: 1
    });
  }
}
*/
/*

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
      minStep: 1
    }, 'Radon Long Term Average');

    this.createCharacteristics('RadonShortTermAverage', 'B42E01AA-ADE7-11E4-89D3-123B93F75CBA', {
      format: Formats.UINT16,
      perms: [Perms.PAIRED_READ, Perms.NOTIFY],
      minValue: 0,
      maxValue: 1000,
      minStep: 1
    }, 'Radon Short Term Average');

    this.createCharacteristics('VOC_Level', 'B42E41C4-ADE7-11E4-89D3-123B93F75CBA', {
      format: Formats.FLOAT,
      perms: [Perms.PAIRED_READ, Perms.NOTIFY],
      minValue: 0,
      maxValue: 5000,
      minStep: 1
    }, 'VOC Level');

    this.createCharacteristics('Pressure', '873AE82A-4C5A-4342-B539-9D900BF7EBD0', {
      format: Formats.UINT16,
      perms: [Perms.PAIRED_READ, Perms.NOTIFY],
      minValue: 0,
      maxValue: 1200,
      minStep: 1
    }, 'Pressure');
  }

  private createCharacteristics(key: string, uuid: string, props: CharacteristicProps, displayName: string = key) {
    this.characteristic[key] = class extends this.api.hap.Characteristic {
      static readonly UUID: string = uuid;
      constructor() {
        super(displayName, uuid, props);
        this.value = this.getDefaultValue();
      }
    }
  }
}

*/
