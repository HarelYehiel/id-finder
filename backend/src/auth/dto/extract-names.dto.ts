import { IsString, MinLength } from 'class-validator';

export class ExtractNamesDto {
  @IsString()
  @MinLength(1)
  text: string;
}