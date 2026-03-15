import { IsNotEmpty, IsString } from 'class-validator';

export class ParseTextDto {
  @IsString()
  @IsNotEmpty()
  text: string;
}