/**
 * Param schemas. One schema per kind or effect drives types, defaults,
 * validation, the playground controls and (later) shader backends (plan §4.1).
 */

export interface NumberParam {
  type: 'number';
  default: number;
  min?: number;
  max?: number;
  step?: number;
  /** `'px'` costs and widths scale with the bake resolution. */
  unit?: string;
  /** Multiplied by the `rayScale` render option (plan §4.1). */
  ray?: boolean;
  label?: string;
}

export interface AngleParam {
  type: 'angle';
  default: number;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
}

export interface ColorParam {
  type: 'color';
  default: string;
  label?: string;
}

export interface BooleanParam {
  type: 'boolean';
  default: boolean;
  label?: string;
}

export interface EnumParam {
  type: 'enum';
  default: string;
  values: readonly string[];
  label?: string;
}

export interface ChannelsParam {
  type: 'channels';
  default: readonly string[];
  label?: string;
}

export type ParamSchema =
  NumberParam | AngleParam | ColorParam | BooleanParam | EnumParam | ChannelsParam;

export type ParamMap = Record<string, ParamSchema>;

/** The runtime value type a schema describes. */
export type ValueOfParam<P> = P extends { type: 'number' | 'angle' }
  ? number
  : P extends { type: 'color' }
    ? string
    : P extends { type: 'boolean' }
      ? boolean
      : P extends { type: 'channels' }
        ? string[]
        : P extends { type: 'enum'; values: readonly (infer V)[] }
          ? V
          : unknown;

/** Derive the param value type from a schema map: `ParamsOf<typeof dots>`. */
export type ParamsFromSchema<P extends ParamMap> = {
  [K in keyof P]: ValueOfParam<P[K]>;
};

export type ParamsOf<D> = D extends { params: infer P extends ParamMap }
  ? ParamsFromSchema<P>
  : Record<string, unknown>;
