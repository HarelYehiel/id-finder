import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { USERS } from './data/users.data';
import { LoginDto } from './dto/login.dto';
import { ParseTextDto } from './dto/parse-text.dto';
import { GoogleSheetsService } from './google-sheets.service';
import levenshtein from 'fast-levenshtein';
import axios from 'axios';

type MatchType =
  | 'מספר'
  | 'שם מלא'
  | 'כינוי'
  | 'התאמה חלקית'
  | 'לא נמצא'
  | 'לא חד משמעי';

type SourceRow = {
  id: string;
  firstName: string;
  lastName: string;
  pluga: string;
  role: string;
};

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

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly googleSheetsService: GoogleSheetsService,
  ) { }

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
    לוי: ['לייבי'],
    שטיבר: ['שטאובר'],
    דב: ['דובי', 'דוב'],

    "ג'רמי": ['גרמי', 'ג׳רמי'],
    "ג'ורנו": ['גורנו', 'ג׳ורנו'],
    "גדז'": ['גדז', 'גדז׳'],
    "פרג'ון": ['פרגון', 'פרג׳ון'],
    "תורג'מן": ['תורגמן'],
    "ג'ורדן": ['גורדן', 'ג׳ורדן'],
    "ג'ייקובס": ['גיקובס', 'ג׳ייקובס', 'יעקובס'],
    "סיגייצ'נקוב": ['סיגייצנקוב', 'סיגיצנקוב'],
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

  async extractNames(text: string): Promise<string[]> {
    if (!text?.trim()) {
      throw new BadRequestException('לא התקבל טקסט');
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new InternalServerErrorException('OPENAI_API_KEY לא מוגדר');
    }

    try {
      const response = await axios.post(
        'https://api.openai.com/v1/responses',
        {
          model: 'gpt-5-mini',
          input: [
            {
              role: 'system',
              content: [
                {
                  type: 'input_text',
                  text:
                    'החזר רק שמות מלאים של אנשים.\n' +
                    'כל שורה = שם אחד בלבד.\n' +
                    'בלי כותרות, בלי מספור, בלי הסברים.\n' +
                    'אם שורה לא מכילה שם, אל תחזיר אותה.',
                },
              ],
            },
            {
              role: 'user',
              content: [
                {
                  type: 'input_text',
                  text,
                },
              ],
            },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        },
      );

      console.error(
        'OpenAI raw response:',
        JSON.stringify(response.data, null, 2),
      );

      let outputText = response.data?.output_text ?? '';

      if (!outputText) {
        const output = response.data?.output;

        if (Array.isArray(output)) {
          const texts: string[] = [];

          for (const item of output) {
            if (Array.isArray(item?.content)) {
              for (const contentItem of item.content) {
                if (
                  contentItem?.type === 'output_text' &&
                  typeof contentItem?.text === 'string'
                ) {
                  texts.push(contentItem.text);
                }
              }
            }
          }

          outputText = texts.join('\n').trim();
        }
      }

      console.error('OpenAI extracted text:', outputText);

      return String(outputText)
        .split('\n')
        .map((line: string) => line.trim())
        .filter(Boolean);
    } catch (error: any) {
      const status = error?.response?.status;
      const data = error?.response?.data;

      console.error('OpenAI extractNames status:', status);
      console.error(
        'OpenAI extractNames data:',
        JSON.stringify(data, null, 2),
      );

      if (status === 401) {
        throw new InternalServerErrorException('מפתח OpenAI לא תקין');
      }

      if (status === 429) {
        throw new InternalServerErrorException(
          `הגעת למגבלת שימוש או חיוב: ${JSON.stringify(data)}`,
        );
      }

      throw new InternalServerErrorException(
        `שגיאה בחילוץ שמות מול OpenAI: ${JSON.stringify(data)}`,
      );
    }
  }

  private normalizeText(value: string): string {
    return String(value ?? '')
      .trim()
      .replace(/['׳״"`´’‘]/g, '')
      .replace(/[^\u0590-\u05FFa-zA-Z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private isFuzzyMatch(a: string, b: string): boolean {
    if (!a || !b) return false;

    a = this.normalizeText(a);
    b = this.normalizeText(b);

    if (a.length < 4 || b.length < 4) return false;
    if (a[0] !== b[0]) return false;
    if (Math.abs(a.length - b.length) > 1) return false;

    const distance = levenshtein.get(a, b);
    return distance <= 1;
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

  private getWords(value: string): string[] {
    return this.normalizeText(value).split(' ').filter(Boolean);
  }

  private matchesWholeWordInName(fullName: string, input: string): boolean {
    const words = this.getWords(fullName);
    const normalizedInput = this.normalizeText(input);
    return words.includes(normalizedInput);
  }

  private getAliasCandidates(value: string): string[] {
    const normalized = this.normalizeText(value);
    const words = this.getWords(value);

    const candidates = new Set<string>();

    if (normalized) candidates.add(normalized);
    words.forEach((word) => candidates.add(word));

    for (const [realName, aliases] of Object.entries(this.aliasMap)) {
      const normalizedRealName = this.normalizeText(realName);
      const normalizedAliases = aliases.map((alias) => this.normalizeText(alias));

      if (
        normalized === normalizedRealName ||
        words.includes(normalizedRealName) ||
        normalizedAliases.includes(normalized) ||
        words.some((word) => normalizedAliases.includes(word))
      ) {
        candidates.add(normalizedRealName);
        normalizedAliases.forEach((alias) => candidates.add(alias));
      }
    }

    return Array.from(candidates);
  }

  private areNamePartsCompatible(inputPart: string, rowPart: string): boolean {
    const inputCandidates = this.getAliasCandidates(inputPart);
    const rowCandidates = this.getAliasCandidates(rowPart);

    return inputCandidates.some((candidate) => rowCandidates.includes(candidate));
  }

  private findByNumber(
    excelRows: SourceRow[],
    extractedNumber: string,
  ): SourceRow | null {
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

    const parts = input.split(' ').filter(Boolean);
    if (parts.length < 2) {
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

    const splitNormal = {
      left: parts[0],
      right: parts.slice(1).join(' '),
    };

    const splitReversed = {
      left: parts.slice(0, parts.length - 1).join(' '),
      right: parts[parts.length - 1],
    };

    const aliasMatches = rowsInPluga.filter((row) => {
      const rowLastName = this.normalizeText(row.lastName);

      return (
        rowLastName === this.normalizeText(splitNormal.right) &&
        this.areNamePartsCompatible(splitNormal.left, row.firstName)
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

    const reversedAliasMatches = rowsInPluga.filter((row) => {
      const rowLastName = this.normalizeText(row.lastName);

      return (
        rowLastName === this.normalizeText(splitReversed.left) &&
        this.areNamePartsCompatible(splitReversed.right, row.firstName)
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

    const partialMatches = rowsInPluga.filter((row) => {
      const rowFullFirstName = this.normalizeText(row.firstName);
      const rowLastName = this.normalizeText(row.lastName);
      const inputFirstName = this.normalizeText(splitNormal.left);
      const inputLastName = this.normalizeText(splitNormal.right);

      const firstNameMatches =
        rowFullFirstName === inputFirstName ||
        this.matchesWholeWordInName(rowFullFirstName, inputFirstName);

      const lastNameMatches =
        rowLastName === inputLastName ||
        this.matchesWholeWordInName(rowLastName, inputLastName);

      return firstNameMatches && lastNameMatches;
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

    const reversedPartialMatches = rowsInPluga.filter((row) => {
      const rowFullFirstName = this.normalizeText(row.firstName);
      const rowLastName = this.normalizeText(row.lastName);
      const inputLastName = this.normalizeText(splitReversed.left);
      const inputFirstName = this.normalizeText(splitReversed.right);

      const firstNameMatches =
        rowFullFirstName === inputFirstName ||
        this.matchesWholeWordInName(rowFullFirstName, inputFirstName);

      const lastNameMatches =
        rowLastName === inputLastName ||
        this.matchesWholeWordInName(rowLastName, inputLastName);

      return firstNameMatches && lastNameMatches;
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

    const fuzzyMatches = rowsInPluga.filter((row) => {
      const rowFirstName = this.normalizeText(row.firstName);
      const rowLastName = this.normalizeText(row.lastName);

      const inputFirst = this.normalizeText(parts[0]);
      const inputLast = this.normalizeText(parts.slice(1).join(' '));

      const firstNameMatch =
        rowFirstName === inputFirst ||
        this.areNamePartsCompatible(inputFirst, rowFirstName);

      if (!firstNameMatch) return false;

      return this.isFuzzyMatch(inputLast, rowLastName);
    });

    if (fuzzyMatches.length === 1) {
      return {
        matched: true,
        matchType: 'התאמה חלקית',
        result: fuzzyMatches[0],
      };
    }

    if (fuzzyMatches.length > 1) {
      return {
        matched: false,
        matchType: 'לא חד משמעי',
        result: null,
      };
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