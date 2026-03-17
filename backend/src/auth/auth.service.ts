import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { USERS } from './data/users.data';
import { LoginDto } from './dto/login.dto';
import { ParseTextDto } from './dto/parse-text.dto';
import { GoogleSheetsService } from './google-sheets.service';

type MatchType =
  | 'מספר'
  | 'שם מלא'
  | 'כינוי'
  | 'התאמה חלקית'
  | 'לא נמצא'
  | 'לא חד משמעי';

type ParsedLineResult = {
  originalLine: string;
  extractedNumber: string | null;
  matched: boolean;
  matchType: MatchType;
  result: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
    pluga: string;
  } | null;
};

type SourceRow = {
  id: string;
  firstName: string;
  lastName: string;
  pluga: string;
  role: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly googleSheetsService: GoogleSheetsService,
  ) {}

  private readonly aliasMap: Record<string, string[]> = {
    אברהם: ['אבי', 'אברם'],
    יעקב: ['קובי', 'יענקל'],
    יוסף: ['יוסי'],
    יצחק: ['איציק'],
    שמואל: ['שמוליק'],
    מרדכי: ['מוטי'],
    דוד: ['דודי', 'דודו'],
  משה: ['מושיקו', 'מושון'],
  שלמה: ['שלומי', 'שלומקה'],
  חיים: ['חיימי'],
  מאיר: ['מירי'],
  יהודה: ['אודי', 'יודי'],
  אליהו: ['אלי'],
  אלעזר: ['לייזר'],
  ישראל: ['שרול', 'שרולי'],
  אריה: ['אריק', 'לייב'],
  בנימין: ['בני', 'בנצי'],
  דניאל: ['דני'],
  נתן: ['נתי'],
  מתן: ['מתי'],
  איתן: ['איתי'],
  רפאל: ['רפי'],
  גבריאל: ['גבי'],
  מיכאל: ['מיכי'],
  נועם: ['נומי'],
  עומר: ['עומרי'],
  אלון: ['אלוני'],
  עמית: ['עמיתי'],
  תומר: ['תומי'],
  יאיר: ['יאירי'],
  עידו: ['עידולי'],
  רון: ['רוני'],
  אור: ['אורי'],
  עוז: ['עוזי'],
  שי: ['שייקה'],
  ברוך: ['בורי'],
  צבי: ['צביקה'],
  פנחס: ['פיני'],
  אפרים: ['אפי'],
  יוחנן: ['יוחי'],
  זכריה: ['זכי'],
  מנחם: ['מני'],
  לוי: ['לייבי']
  };

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

  private normalizeText(value: string): string {
    return String(value ?? '')
      .trim()
      .replace(/['״`´*]/g, '')
      .replace(/[^\u0590-\u05FFa-zA-Z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private extractNumber(line: string): string | null {
    const match = String(line ?? '').match(/\d{7,}/);
    return match ? match[0] : null;
  }

  private getFullName(row: SourceRow): string {
    return this.normalizeText(`${row.firstName} ${row.lastName}`);
  }

  private getReversedFullName(row: SourceRow): string {
    return this.normalizeText(`${row.lastName} ${row.firstName}`);
  }

  private getBaseFirstName(firstName: string): string {
    return this.normalizeText(firstName).split(' ')[0] ?? '';
  }

  private isAliasMatch(inputFirstName: string, candidateFirstName: string): boolean {
    const normalizedInput = this.normalizeText(inputFirstName);
    const candidateBaseName = this.getBaseFirstName(candidateFirstName);

    const aliases = this.aliasMap[candidateBaseName] ?? [];
    return aliases.some((alias) => this.normalizeText(alias) === normalizedInput);
  }

  private splitInputToTwoSides(line: string): { left: string; right: string } | null {
    const normalized = this.normalizeText(line);
    const parts = normalized.split(' ').filter(Boolean);

    if (parts.length < 2) {
      return null;
    }

    return {
      left: parts[0],
      right: parts.slice(1).join(' '),
    };
  }

  private findByNumber(excelRows: SourceRow[], extractedNumber: string): SourceRow | null {
    return excelRows.find((row) => String(row.id) === String(extractedNumber)) ?? null;
  }

  private findByNameWithinPluga(
    excelRows: SourceRow[],
    line: string,
    pluga?: string,
  ): {
    matched: boolean;
    matchType: MatchType;
    result: SourceRow | null;
  } {
    if (!pluga || !this.normalizeText(pluga)) {
      return {
        matched: false,
        matchType: 'לא נמצא',
        result: null,
      };
    }

    const input = this.normalizeText(line);

    if (!input) {
      return {
        matched: false,
        matchType: 'לא נמצא',
        result: null,
      };
    }

    const normalizedPluga = this.normalizeText(pluga);

    const rowsInPluga = excelRows.filter(
      (row) => this.normalizeText(row.pluga) === normalizedPluga,
    );

    // 1) התאמה מדויקת: "דניאל בן משה"
    const exactMatches = rowsInPluga.filter(
      (row) => this.getFullName(row) === input,
    );

    if (exactMatches.length === 1) {
      return {
        matched: true,
        matchType: 'שם מלא',
        result: exactMatches[0],
      };
    }

    if (exactMatches.length > 1) {
      return {
        matched: false,
        matchType: 'לא חד משמעי',
        result: null,
      };
    }

    // 2) התאמה מדויקת הפוכה: "בן משה דניאל"
    const reversedExactMatches = rowsInPluga.filter(
      (row) => this.getReversedFullName(row) === input,
    );

    if (reversedExactMatches.length === 1) {
      return {
        matched: true,
        matchType: 'שם מלא',
        result: reversedExactMatches[0],
      };
    }

    if (reversedExactMatches.length > 1) {
      return {
        matched: false,
        matchType: 'לא חד משמעי',
        result: null,
      };
    }

    const splitNormal = this.splitInputToTwoSides(input);
    const parts = input.split(' ').filter(Boolean);

    // 3) התאמה חלקית חזקה:
    // "מאיר נחשוני" -> "מאיר צב נחשוני"
    if (splitNormal) {
      const partialMatches = rowsInPluga.filter((row) => {
        const rowLastName = this.normalizeText(row.lastName);
        const rowBaseFirstName = this.getBaseFirstName(row.firstName);

        return (
          rowLastName === splitNormal.right &&
          rowBaseFirstName === this.normalizeText(splitNormal.left)
        );
      });

      if (partialMatches.length === 1) {
        return {
          matched: true,
          matchType: 'התאמה חלקית',
          result: partialMatches[0],
        };
      }

      if (partialMatches.length > 1) {
        return {
          matched: false,
          matchType: 'לא חד משמעי',
          result: null,
        };
      }
    }

    // 4) התאמה חלקית חזקה בסדר הפוך:
    // "נחשוני מאיר" -> "מאיר צב נחשוני"
    if (parts.length >= 2) {
      const splitReversedPartial = {
        left: parts.slice(0, parts.length - 1).join(' '),
        right: parts[parts.length - 1],
      };

      const reversedPartialMatches = rowsInPluga.filter((row) => {
        const rowLastName = this.normalizeText(row.lastName);
        const rowBaseFirstName = this.getBaseFirstName(row.firstName);

        return (
          rowLastName === splitReversedPartial.left &&
          rowBaseFirstName === this.normalizeText(splitReversedPartial.right)
        );
      });

      if (reversedPartialMatches.length === 1) {
        return {
          matched: true,
          matchType: 'התאמה חלקית',
          result: reversedPartialMatches[0],
        };
      }

      if (reversedPartialMatches.length > 1) {
        return {
          matched: false,
          matchType: 'לא חד משמעי',
          result: null,
        };
      }
    }

    // 5) התאמת כינוי: "יוסי לובין" -> "יוסף לובין"
    if (splitNormal) {
      const aliasMatches = rowsInPluga.filter((row) => {
        const rowLastName = this.normalizeText(row.lastName);
        return (
          rowLastName === splitNormal.right &&
          this.isAliasMatch(splitNormal.left, row.firstName)
        );
      });

      if (aliasMatches.length === 1) {
        return {
          matched: true,
          matchType: 'כינוי',
          result: aliasMatches[0],
        };
      }

      if (aliasMatches.length > 1) {
        return {
          matched: false,
          matchType: 'לא חד משמעי',
          result: null,
        };
      }
    }

    // 6) התאמת כינוי הפוכה: "לובין יוסי"
    if (parts.length >= 2) {
      const splitReversed = {
        left: parts.slice(0, parts.length - 1).join(' '),
        right: parts[parts.length - 1],
      };

      const reversedAliasMatches = rowsInPluga.filter((row) => {
        const rowLastName = this.normalizeText(row.lastName);
        return (
          rowLastName === splitReversed.left &&
          this.isAliasMatch(splitReversed.right, row.firstName)
        );
      });

      if (reversedAliasMatches.length === 1) {
        return {
          matched: true,
          matchType: 'כינוי',
          result: reversedAliasMatches[0],
        };
      }

      if (reversedAliasMatches.length > 1) {
        return {
          matched: false,
          matchType: 'לא חד משמעי',
          result: null,
        };
      }
    }

    return {
      matched: false,
      matchType: 'לא נמצא',
      result: null,
    };
  }

  async parseTextAndSearchExcel(parseTextDto: ParseTextDto) {
    const excelRows = await this.googleSheetsService.readSourceRows();

    const inputLines = parseTextDto.text
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const results: ParsedLineResult[] = [];

    if (parseTextDto.searchMode === 'number') {
      for (const line of inputLines) {
        const extractedNumber = this.extractNumber(line);

        if (!extractedNumber) {
          continue;
        }

        const foundRow = this.findByNumber(excelRows, extractedNumber);

        if (!foundRow) {
          results.push({
            originalLine: line,
            extractedNumber,
            matched: false,
            matchType: 'לא נמצא',
            result: null,
          });
          continue;
        }

        results.push({
          originalLine: line,
          extractedNumber,
          matched: true,
          matchType: 'מספר',
          result: {
            id: foundRow.id,
            firstName: foundRow.firstName,
            lastName: foundRow.lastName,
            role: foundRow.role,
            pluga: foundRow.pluga,
          },
        });
      }
    }

    if (parseTextDto.searchMode === 'name') {
      for (const line of inputLines) {
        const nameSearch = this.findByNameWithinPluga(
          excelRows,
          line,
          parseTextDto.pluga,
        );

        results.push({
          originalLine: line,
          extractedNumber: null,
          matched: nameSearch.matched,
          matchType: nameSearch.matchType,
          result: nameSearch.result
            ? {
                id: nameSearch.result.id,
                firstName: nameSearch.result.firstName,
                lastName: nameSearch.result.lastName,
                role: nameSearch.result.role,
                pluga: nameSearch.result.pluga,
              }
            : null,
        });
      }
    }

    if (results.length === 0) {
      return {
        message:
          parseTextDto.searchMode === 'number'
            ? 'לא נמצאו מספרים תקינים בטקסט'
            : 'לא נמצאו שורות תקינות בטקסט',
        totalLines: inputLines.length,
        results: [],
      };
    }

    const outputRows = results.map((item) => ({
      identityNumber: item.result?.id ?? item.extractedNumber ?? null,
      firstName: item.result?.firstName ?? null,
      lastName: item.result?.lastName ?? null,
      role: item.result?.role ?? null,
      matchType: item.matchType,
      notes:
        item.matchType === 'לא נמצא'
          ? 'לא נמצא בגיליון'
          : item.matchType === 'לא חד משמעי'
            ? 'נמצאו כמה התאמות אפשריות'
            : null,
    }));

    await this.googleSheetsService.writeResults(outputRows);

    return {
      message: 'העיבוד הושלם',
      totalLines: inputLines.length,
      searchMode: parseTextDto.searchMode,
      selectedPluga:
        parseTextDto.searchMode === 'name' ? parseTextDto.pluga ?? null : null,
      results,
    };
  }
}