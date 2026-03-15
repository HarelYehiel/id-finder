import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('parse-text')
  parseText(@Body() body: any) {
    const text =
      typeof body === 'string'
        ? body
        : typeof body?.text === 'string'
        ? body.text
        : null;

    if (!text) {
      throw new BadRequestException('לא התקבל טקסט תקין');
    }

    return this.authService.parseTextAndSearchExcel({ text });
  }
}