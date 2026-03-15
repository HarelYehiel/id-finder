import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { USERS } from './data/users.data';
import { LoginDto } from './dto/login.dto';
import { ParseTextDto } from './dto/parse-text.dto';
import { GoogleSheetsService } from './google-sheets.service';

type ExcelRow = {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
};

type ParsedLineResult = {
  originalLine: string;
  extractedNumber: string | null;
  matched: boolean;
  result: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
  } | null;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly googleSheetsService: GoogleSheetsService,
  ) {}

  private readonly excelUrl =
    'https://docs.google.com/spreadsheets/d/1C0CXS6TSci-V19pCjRFbW5n5BYjJnS8YOTVRkr5Ym8Y/export?format=xlsx';

  login(loginDto: LoginDto) {
    const user = USERS.find(
      (item) =>
        item.code === loginDto.code &&
        item.identityNumber === loginDto.identityNumber,
    );

    if (!user) {
      throw new UnauthorizedException('קוד או מספר זיהוי שגויים');
    }

    const payload = {
      fullName: user.fullName,
      code: user.code,
      identityNumber: user.identityNumber,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      message: 'התחברות הצליחה',
      access_token: accessToken,
      user,
    };
  }

  async parseTextAndSearchExcel(parseTextDto: ParseTextDto) {
    const workbook = await this.downloadWorkbookFromInternet(this.excelUrl);
    const excelRows = this.extractRowsFromWorkbook(workbook);

    const inputLines = parseTextDto.text
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const results: ParsedLineResult[] = [];

    for (const line of inputLines) {
      const match = line.match(/\d{7,}/);
      const extractedNumber = match ? match[0] : null;

      // שורות בלי מספר - מדלגים עליהן לגמרי
      if (!extractedNumber) {
        continue;
      }

      const foundRow = excelRows.find(
        (row) => String(row.id) === String(extractedNumber),
      );

      if (!foundRow) {
        const noMatchResult: ParsedLineResult = {
          originalLine: line,
          extractedNumber,
          matched: false,
          result: null,
        };

        console.log(noMatchResult);
        results.push(noMatchResult);
        continue;
      }

      const successResult: ParsedLineResult = {
        originalLine: line,
        extractedNumber,
        matched: true,
        result: {
          id: foundRow.id,
          firstName: foundRow.firstName,
          lastName: foundRow.lastName,
          role: foundRow.role,
        },
      };

      console.log(successResult);
      results.push(successResult);
    }

    // אם לא נמצאו בכלל מספרים תקינים - לא יוצרים בלוק חדש בגיליון
    if (results.length === 0) {
      return {
        message: 'לא נמצאו מספרים תקינים בטקסט',
        totalLines: inputLines.length,
        results: [],
      };
    }

    const outputRows = results.map((item) => ({
      identityNumber: item.extractedNumber,
      firstName: item.result?.firstName ?? null,
      lastName: item.result?.lastName ?? null,
      role: item.result?.role ?? null,
      notes: item.matched === false ? 'לא נמצא בגיליון' : null,
    }));

    console.log('ROWS TO WRITE:', outputRows);

    await this.googleSheetsService.writeResults(outputRows);

    console.log('WRITE TO SHEET COMPLETED');

    return {
      message: 'העיבוד הושלם',
      totalLines: inputLines.length,
      results,
    };
  }

  private async downloadWorkbookFromInternet(
    url: string,
  ): Promise<XLSX.WorkBook> {
    const response = await axios.get<ArrayBuffer>(url, {
      responseType: 'arraybuffer',
    });

    const data = new Uint8Array(response.data);
    return XLSX.read(data, { type: 'array' });
  }

  private fixHebrew(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }

    const text = String(value).trim();

    if (text.includes('×')) {
      return Buffer.from(text, 'latin1').toString('utf8').trim();
    }

    return text;
  }

  private extractRowsFromWorkbook(workbook: XLSX.WorkBook): ExcelRow[] {
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    const rows: unknown[][] = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: '',
    });

    const dataRows = rows.slice(1);

    return dataRows.map((row) => ({
      id: String(row[0] ?? '').trim().replace('.0', '').replace(/\s/g, ''),
      firstName: this.fixHebrew(row[1]),
      lastName: this.fixHebrew(row[2]),
      role: this.fixHebrew(row[6]),
    }));
  }
}