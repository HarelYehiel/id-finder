import { IsNotEmpty } from 'class-validator';

export class LoginDto {
  @IsNotEmpty()
  code: string;

  @IsNotEmpty()
  identityNumber: string;
}