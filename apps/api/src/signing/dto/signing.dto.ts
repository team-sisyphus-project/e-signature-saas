import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

/** Upper bound for a captured field value (signature dataURL can be large). */
export const FIELD_VALUE_MAX_LENGTH = 5_000_000;

export class VerifyCodeDto {
  /**
   * 6-digit numeric verification code delivered out of band.
   *
   * The shape rule lives in `SigningService.verify`, not in a `@Matches` here:
   * a `class-validator` message cannot be localized, and the person reading it
   * never logged in and never chose the language it would be written in. The
   * service checks the same code before comparing anything.
   */
  @IsString()
  code!: string;
}

/** A single captured field value (signature dataURL / text / date string). */
export class FieldValueDto {
  @IsString()
  @MaxLength(64)
  fieldId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(FIELD_VALUE_MAX_LENGTH)
  value!: string;
}

export class SaveFieldValuesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => FieldValueDto)
  fields!: FieldValueDto[];
}
