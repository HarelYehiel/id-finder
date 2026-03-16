import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ParseTextDto } from './dto/parse-text.dto';
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

    const searchMode =
      body?.searchMode === 'number' || body?.searchMode === 'name'
        ? body.searchMode
        : null;

    const pluga =
      typeof body?.pluga === 'string' && body.pluga.trim().length > 0
        ? body.pluga.trim()
        : undefined;

    if (!text) {
      throw new BadRequestException('לא התקבל טקסט תקין');
    }

    if (!searchMode) {
      throw new BadRequestException('לא התקבל searchMode תקין');
    }

    if (searchMode === 'name' && !pluga) {
      throw new BadRequestException('יש לבחור פלוגה בחיפוש לפי שם');
    }

    const dto: ParseTextDto = {
      text,
      searchMode,
      pluga,
    };

    return this.authService.parseTextAndSearchExcel(dto);
  }
}