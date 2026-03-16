import { IsIn, IsOptional, IsString } from 'class-validator';

export class ParseTextDto {
  @IsString()
  text: string;

  @IsIn(['number', 'name'])
  searchMode: 'number' | 'name';

  @IsOptional()
  @IsString()
  pluga?: string;
}