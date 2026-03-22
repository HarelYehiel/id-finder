import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { GoogleSheetsService } from './google-sheets.service';

type SourceRow = {
  id: string;
  firstName: string;
  lastName: string;
  pluga: string;
  role: string;
};

describe('AuthService', () => {
  let service: AuthService;

  const mockGoogleSheetsService = {
    readSourceRows: jest.fn(),
    writeResults: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('fake-token'),
  };

  const baseRows: SourceRow[] = [
    { id: '9182453', firstName: 'משה', lastName: 'בן נון', pluga: "פלוגה מבצעית א'", role: '' },
    { id: '8764319', firstName: 'אלון דו', lastName: 'ברששת', pluga: "פלוגה מבצעית א'", role: '' },
    { id: '8712645', firstName: 'אנזו יע', lastName: 'גרשון', pluga: "פלוגה מבצעית א'", role: '' },
    { id: '7346812', firstName: 'אברהם פ', lastName: 'הלפרין', pluga: "פלוגה מבצעית א'", role: '' },
    { id: '9241587', firstName: 'יוחאי י', lastName: 'הדרי', pluga: "פלוגה מבצעית א'", role: '' },
    { id: '9217435', firstName: 'דניאל', lastName: 'חזן', pluga: "פלוגה מבצעית א'", role: '' },
    { id: '9276148', firstName: 'יאשיהו', lastName: 'חלפון', pluga: "פלוגה מבצעית א'", role: '' },
    { id: '9048267', firstName: 'מנחם נה', lastName: 'טלמון', pluga: "פלוגה מבצעית א'", role: '' },
    { id: '8783521', firstName: 'מנחם מנ', lastName: 'יערי', pluga: "פלוגה מבצעית א'", role: '' },
    { id: '8759402', firstName: 'יוסף', lastName: 'ירחי', pluga: "פלוגה מבצעית א'", role: '' },
    { id: '8064729', firstName: 'יואב אב', lastName: 'ישראלוב', pluga: "פלוגה מבצעית א'", role: '' },
    { id: '9051836', firstName: 'שילה נח', lastName: 'לביא', pluga: "פלוגה מבצעית א'", role: '' },
    { id: '6079154', firstName: 'יהונתן', lastName: 'מזרחי', pluga: "פלוגה מבצעית א'", role: '' },
    { id: '7594381', firstName: 'דניאל', lastName: 'סער', pluga: "פלוגה מבצעית א'", role: '' },
    { id: '9281406', firstName: 'יעקב יש', lastName: 'קריב', pluga: "פלוגה מבצעית א'", role: '' },
    { id: '6918274', firstName: 'בן ציון', lastName: 'רוזן', pluga: "פלוגה מבצעית א'", role: '' },
    { id: '7483920', firstName: 'מיכאל מ', lastName: 'שחר', pluga: "פלוגה מבצעית א'", role: '' },

    { id: '7512846', firstName: 'אל חי', lastName: 'אביטן', pluga: "פלוגה מבצעית ב'", role: '' },
    { id: '9175038', firstName: 'ישראל', lastName: 'אדרי', pluga: "פלוגה מבצעית ב'", role: '' },
    { id: '5441682', firstName: 'נעם', lastName: 'אורן', pluga: "פלוגה מבצעית ב'", role: '' },
    { id: '5629148', firstName: 'אהרון', lastName: 'אוחנה', pluga: "פלוגה מבצעית ב'", role: '' },
    { id: '5791026', firstName: 'עידו', lastName: 'אילוז', pluga: "פלוגה מבצעית ב'", role: '' },
    { id: '8493157', firstName: 'משה', lastName: 'אטיה', pluga: "פלוגה מבצעית ב'", role: '' },
    { id: '8614720', firstName: 'שקד', lastName: 'אטון', pluga: "פלוגה מבצעית ב'", role: '' },
    { id: '6175309', firstName: 'יוסף', lastName: 'איבגי', pluga: "פלוגה מבצעית ב'", role: '' },
    { id: '9063184', firstName: 'ראובן', lastName: 'אלקיים', pluga: "פלוגה מבצעית ב'", role: '' },
    { id: '8810527', firstName: "ג'רמי מ", lastName: 'אלמוג', pluga: "פלוגה מבצעית ב'", role: '' },
    { id: '8749253', firstName: 'דניאל ס', lastName: 'אלחרר', pluga: "פלוגה מבצעית ב'", role: '' },
    { id: '8087361', firstName: 'אשר בני', lastName: 'אלון', pluga: "פלוגה מבצעית ב'", role: '' },
    { id: '7581942', firstName: 'שמעון', lastName: 'אלימלך', pluga: "פלוגה מבצעית ב'", role: '' },
    { id: '8476203', firstName: 'דן', lastName: 'אמיתי', pluga: "פלוגה מבצעית ב'", role: '' },
    { id: '8695041', firstName: 'שלמה', lastName: 'אמרן', pluga: "פלוגה מבצעית ב'", role: '' },
    { id: '7480159', firstName: 'דוד', lastName: 'אסרף', pluga: "פלוגה מבצעית ב'", role: '' },
    { id: '5894367', firstName: 'יהונתן', lastName: 'אבוחצירא', pluga: "פלוגה מבצעית ב'", role: '' },
    { id: '7618420', firstName: 'יעקב אב', lastName: 'אפגין', pluga: "פלוגה מבצעית ב'", role: '' },
    { id: '7694583', firstName: 'נחמן', lastName: 'ארזי', pluga: "פלוגה מבצעית ב'", role: '' },
    { id: '9083645', firstName: 'ינון', lastName: 'ארבל', pluga: "פלוגה מבצעית ב'", role: '' },
    { id: '5961304', firstName: 'אורי גד', lastName: 'ארד', pluga: "פלוגה מבצעית ב'", role: '' },
    { id: '8672019', firstName: 'יעקב', lastName: 'ביטון', pluga: "פלוגה מבצעית ב'", role: '' },
    { id: '5238407', firstName: 'שילה', lastName: 'בן עטר', pluga: "פלוגה מבצעית ב'", role: '' },
    { id: '8294516', firstName: 'נתנאל י', lastName: 'בן חמו', pluga: "פלוגה מבצעית ב'", role: '' },

    { id: '5862049', firstName: 'נועם', lastName: 'לוגסי', pluga: "פלוגה מבצעית ג'", role: '' },
    { id: '9243708', firstName: 'מיכאל', lastName: 'מור', pluga: "פלוגה מבצעית ג'", role: '' },
    { id: '9196842', firstName: 'אליה', lastName: 'נבון', pluga: "פלוגה מבצעית ג'", role: '' },
    { id: '7392158', firstName: 'אביאל ש', lastName: 'סוויסה', pluga: "פלוגה מבצעית ג'", role: '' },
    { id: '8394705', firstName: 'אלחנן', lastName: 'עטון', pluga: "פלוגה מבצעית ג'", role: '' },
    { id: '8813264', firstName: 'שמואל', lastName: 'צרפתי', pluga: "פלוגה מבצעית ג'", role: '' },
    { id: '6814527', firstName: 'פנחס דו', lastName: 'שטרית', pluga: "פלוגה מבצעית ג'", role: '' },
    { id: '8427961', firstName: 'מרדכי', lastName: 'שלו', pluga: "פלוגה מבצעית ג'", role: '' },
    { id: '8231469', firstName: 'שמואל ע', lastName: 'שרביט', pluga: "פלוגה מבצעית ג'", role: '' },
    { id: '8482503', firstName: 'ישראל מ', lastName: 'אהרן', pluga: "פלוגה מבצעית ג'", role: '' },
    { id: '5612307', firstName: 'מתנאל', lastName: 'דוידוב', pluga: "פלוגה מבצעית ג'", role: '' },
    { id: '6015482', firstName: 'ידידיה', lastName: 'דיין', pluga: "פלוגה מבצעית ג'", role: '' },
    { id: '5948031', firstName: 'דוד שלמ', lastName: 'נעים', pluga: "פלוגה מבצעית ג'", role: '' },
    { id: '5742168', firstName: 'שחר יצח', lastName: 'חיים', pluga: "פלוגה מבצעית ג'", role: '' },
    { id: '7603952', firstName: 'נווה', lastName: 'כהנא', pluga: "פלוגה מבצעית ג'", role: '' },
    { id: '8641705', firstName: 'יהודה', lastName: 'לביא', pluga: "פלוגה מבצעית ג'", role: '' },
    { id: '6819346', firstName: 'יוגב', lastName: 'מזרחי', pluga: "פלוגה מבצעית ג'", role: '' },
    { id: '5328741', firstName: 'ים', lastName: 'מורי', pluga: "פלוגה מבצעית ג'", role: '' },
    { id: '5703164', firstName: 'הדר', lastName: 'מצליח', pluga: "פלוגה מבצעית ג'", role: '' },
    { id: '8405072', firstName: 'אדיר', lastName: 'עזרא', pluga: "פלוגה מבצעית ג'", role: '' },
    { id: '7608215', firstName: 'צור', lastName: 'עמיאל', pluga: "פלוגה מבצעית ג'", role: '' },
    { id: '7334189', firstName: 'נתנאל', lastName: 'פרידמן', pluga: "פלוגה מבצעית ג'", role: '' },
    { id: '5316940', firstName: 'איתן שמ', lastName: 'פלד', pluga: "פלוגה מבצעית ג'", role: '' },
    { id: '5921847', firstName: 'הילאי', lastName: 'צמח', pluga: "פלוגה מבצעית ג'", role: '' },

    { id: '8204635', firstName: 'עידן יצ', lastName: 'בן מאיר', pluga: 'פלוגה מסייעת', role: '' },
    { id: '8792140', firstName: 'יוסף חי', lastName: 'בראון', pluga: 'פלוגה מסייעת', role: '' },
    { id: '8309571', firstName: 'יהונתן', lastName: 'ברנד', pluga: 'פלוגה מסייעת', role: '' },
    { id: '8401763', firstName: 'אברהם', lastName: 'גולד', pluga: 'פלוגה מסייעת', role: '' },
    { id: '9192406', firstName: 'יהודה ח', lastName: 'גבע', pluga: 'פלוגה מסייעת', role: '' },
    { id: '8209154', firstName: 'משה ירמ', lastName: 'גינזבורג', pluga: 'פלוגה מסייעת', role: '' },
    { id: '8342716', firstName: 'גולן', lastName: 'גלבוע', pluga: 'פלוגה מסייעת', role: '' },
    { id: '9026485', firstName: 'רואי דו', lastName: 'דרור', pluga: 'פלוגה מסייעת', role: '' },
    { id: '6008742', firstName: 'ישראל מ', lastName: 'הראל', pluga: 'פלוגה מסייעת', role: '' },
    { id: '5708421', firstName: 'עקיבא י', lastName: 'הראלי', pluga: 'פלוגה מסייעת', role: '' },
    { id: '8706139', firstName: 'שמעון', lastName: 'ורדי', pluga: 'פלוגה מסייעת', role: '' },
  ];

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: mockJwtService },
        { provide: GoogleSheetsService, useValue: mockGoogleSheetsService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('isFuzzyMatch', () => {
    const fuzzy = (a: string, b: string) =>
      (service as any).isFuzzyMatch(a, b);

    it('should match close words with distance 1', () => {
      expect(fuzzy('אלמג', 'אלמוג')).toBe(true);
      expect(fuzzy('אביטנ', 'אביטן')).toBe(true);
    });

    it('should not match short words', () => {
      expect(fuzzy('דן', 'דוד')).toBe(false);
      expect(fuzzy('רן', 'רני')).toBe(false);
    });

    it('should not match when first letter is different', () => {
      expect(fuzzy('כהנא', 'לביא')).toBe(false);
      expect(fuzzy('אביטן', 'ברנד')).toBe(false);
    });

    it('should not match when length difference is too big', () => {
      expect(fuzzy('אביטן', 'אביטניםםם')).toBe(false);
    });

    it('should not match when distance is greater than 1', () => {
      expect(fuzzy('אביטן', 'אלקיים')).toBe(false);
    });

    it('should handle trim/normalization safely', () => {
      expect(fuzzy(' אביטנ ', 'אביטן')).toBe(true);
    });
  });

  describe('parseTextAndSearchExcel - name mode', () => {
    it('should write exact full-name result to Google Sheets', async () => {
      mockGoogleSheetsService.readSourceRows.mockResolvedValue(baseRows);
      mockGoogleSheetsService.writeResults.mockResolvedValue(undefined);

      await service.parseTextAndSearchExcel({
        text: 'אל חי אביטן',
        searchMode: 'name',
        pluga: "פלוגה מבצעית ב'",
      } as any);

      expect(mockGoogleSheetsService.writeResults).toHaveBeenCalledWith([
        {
          identityNumber: '7512846',
          firstName: 'אל חי',
          lastName: 'אביטן',
          role: '',
          matchType: 'שם מלא',
          notes: null,
        },
      ]);
    });

    it('should write alias result to Google Sheets', async () => {
      mockGoogleSheetsService.readSourceRows.mockResolvedValue(baseRows);
      mockGoogleSheetsService.writeResults.mockResolvedValue(undefined);

      await service.parseTextAndSearchExcel({
        text: 'אבי הלפרין',
        searchMode: 'name',
        pluga: "פלוגה מבצעית א'",
      } as any);

      expect(mockGoogleSheetsService.writeResults).toHaveBeenCalledWith([
        {
          identityNumber: '7346812',
          firstName: 'אברהם פ',
          lastName: 'הלפרין',
          role: '',
          matchType: 'כינוי',
          notes: null,
        },
      ]);
    });

    it('should write partial-match result to Google Sheets', async () => {
      mockGoogleSheetsService.readSourceRows.mockResolvedValue(baseRows);
      mockGoogleSheetsService.writeResults.mockResolvedValue(undefined);

      await service.parseTextAndSearchExcel({
        text: 'משה נון',
        searchMode: 'name',
        pluga: "פלוגה מבצעית א'",
      } as any);

      expect(mockGoogleSheetsService.writeResults).toHaveBeenCalledWith([
        {
          identityNumber: '9182453',
          firstName: 'משה',
          lastName: 'בן נון',
          role: '',
          matchType: 'התאמה חלקית',
          notes: null,
        },
      ]);
    });

    it('should write not-found result to Google Sheets', async () => {
      mockGoogleSheetsService.readSourceRows.mockResolvedValue(baseRows);
      mockGoogleSheetsService.writeResults.mockResolvedValue(undefined);

      await service.parseTextAndSearchExcel({
        text: 'חיים כהן',
        searchMode: 'name',
        pluga: "פלוגה מבצעית א'",
      } as any);

      expect(mockGoogleSheetsService.writeResults).toHaveBeenCalledWith([
        {
          identityNumber: null,
          firstName: null,
          lastName: null,
          role: null,
          matchType: 'לא נמצא',
          notes: 'לא נמצא בגיליון',
        },
      ]);
    });

    it('should write ambiguous result to Google Sheets', async () => {
      const rowsWithAmbiguous: SourceRow[] = [
        ...baseRows,
        {
          id: '9999991',
          firstName: 'שמואל',
          lastName: 'צרפתי',
          pluga: "פלוגה מבצעית ג'",
          role: '',
        },
      ];

      mockGoogleSheetsService.readSourceRows.mockResolvedValue(rowsWithAmbiguous);
      mockGoogleSheetsService.writeResults.mockResolvedValue(undefined);

      await service.parseTextAndSearchExcel({
        text: 'שמואל צרפתי',
        searchMode: 'name',
        pluga: "פלוגה מבצעית ג'",
      } as any);

      expect(mockGoogleSheetsService.writeResults).toHaveBeenCalledWith([
        {
          identityNumber: null,
          firstName: null,
          lastName: null,
          role: null,
          matchType: 'לא חד משמעי',
          notes: 'נמצאו כמה התאמות אפשריות',
        },
      ]);
    });

    it('should write mixed input rows in the same processing order', async () => {
      mockGoogleSheetsService.readSourceRows.mockResolvedValue(baseRows);
      mockGoogleSheetsService.writeResults.mockResolvedValue(undefined);

      await service.parseTextAndSearchExcel({
        text: [
          'אל חי אביטן',
          'אבי הלפרין',
          'משה נון',
          'חיים כהן',
        ].join('\n'),
        searchMode: 'name',
        pluga: "פלוגה מבצעית א'",
      } as any);

      expect(mockGoogleSheetsService.writeResults).toHaveBeenCalledWith([
        {
          identityNumber: null,
          firstName: null,
          lastName: null,
          role: null,
          matchType: 'לא נמצא',
          notes: 'לא נמצא בגיליון',
        },
        {
          identityNumber: '7346812',
          firstName: 'אברהם פ',
          lastName: 'הלפרין',
          role: '',
          matchType: 'כינוי',
          notes: null,
        },
        {
          identityNumber: '9182453',
          firstName: 'משה',
          lastName: 'בן נון',
          role: '',
          matchType: 'התאמה חלקית',
          notes: null,
        },
        {
          identityNumber: null,
          firstName: null,
          lastName: null,
          role: null,
          matchType: 'לא נמצא',
          notes: 'לא נמצא בגיליון',
        },
      ]);
    });

    it('should handle edge cases with spaces and special characters', async () => {
      mockGoogleSheetsService.readSourceRows.mockResolvedValue(baseRows);
      mockGoogleSheetsService.writeResults.mockResolvedValue(undefined);

      await service.parseTextAndSearchExcel({
        text: '   אל   חי   אביטן!!!   ',
        searchMode: 'name',
        pluga: "פלוגה מבצעית ב'",
      } as any);

      expect(mockGoogleSheetsService.writeResults).toHaveBeenCalledWith([
        {
          identityNumber: '7512846',
          firstName: 'אל חי',
          lastName: 'אביטן',
          role: '',
          matchType: 'שם מלא',
          notes: null,
        },
      ]);
    });

    it('should handle apostrophe normalization correctly', async () => {
      mockGoogleSheetsService.readSourceRows.mockResolvedValue(baseRows);
      mockGoogleSheetsService.writeResults.mockResolvedValue(undefined);

      await service.parseTextAndSearchExcel({
        text: 'גרמי אלמוג',
        searchMode: 'name',
        pluga: "פלוגה מבצעית ב'",
      } as any);

      expect(mockGoogleSheetsService.writeResults).toHaveBeenCalledWith([
        {
          identityNumber: '8810527',
          firstName: "ג'רמי מ",
          lastName: 'אלמוג',
          role: '',
          matchType: 'כינוי',
          notes: null,
        },
      ]);
    });

    it('should return not found for a single-word line in name mode', async () => {
      mockGoogleSheetsService.readSourceRows.mockResolvedValue(baseRows);
      mockGoogleSheetsService.writeResults.mockResolvedValue(undefined);

      await service.parseTextAndSearchExcel({
        text: 'משה',
        searchMode: 'name',
        pluga: "פלוגה מבצעית א'",
      } as any);

      expect(mockGoogleSheetsService.writeResults).toHaveBeenCalledWith([
        {
          identityNumber: null,
          firstName: null,
          lastName: null,
          role: null,
          matchType: 'לא נמצא',
          notes: 'לא נמצא בגיליון',
        },
      ]);
    });

    it('should ignore empty lines and process only valid ones', async () => {
      mockGoogleSheetsService.readSourceRows.mockResolvedValue(baseRows);
      mockGoogleSheetsService.writeResults.mockResolvedValue(undefined);

      await service.parseTextAndSearchExcel({
        text: '\n\nאל חי אביטן\n\n',
        searchMode: 'name',
        pluga: "פלוגה מבצעית ב'",
      } as any);

      expect(mockGoogleSheetsService.writeResults).toHaveBeenCalledWith([
        {
          identityNumber: '7512846',
          firstName: 'אל חי',
          lastName: 'אביטן',
          role: '',
          matchType: 'שם מלא',
          notes: null,
        },
      ]);
    });
  });

  describe('parseTextAndSearchExcel - number mode', () => {
    it('should write exact number match', async () => {
      mockGoogleSheetsService.readSourceRows.mockResolvedValue(baseRows);
      mockGoogleSheetsService.writeResults.mockResolvedValue(undefined);

      await service.parseTextAndSearchExcel({
        text: 'בדיקה 7512846',
        searchMode: 'number',
      } as any);

      expect(mockGoogleSheetsService.writeResults).toHaveBeenCalledWith([
        {
          identityNumber: '7512846',
          firstName: 'אל חי',
          lastName: 'אביטן',
          role: '',
          matchType: 'מספר',
          notes: null,
        },
      ]);
    });

    it('should write not found for unknown number', async () => {
      mockGoogleSheetsService.readSourceRows.mockResolvedValue(baseRows);
      mockGoogleSheetsService.writeResults.mockResolvedValue(undefined);

      await service.parseTextAndSearchExcel({
        text: '9999999',
        searchMode: 'number',
      } as any);

      expect(mockGoogleSheetsService.writeResults).toHaveBeenCalledWith([
        {
          identityNumber: '9999999',
          firstName: null,
          lastName: null,
          role: null,
          matchType: 'לא נמצא',
          notes: 'לא נמצא בגיליון',
        },
      ]);
    });

    it('should skip lines without valid numbers', async () => {
      mockGoogleSheetsService.readSourceRows.mockResolvedValue(baseRows);

      const result = await service.parseTextAndSearchExcel({
        text: 'אין פה מספר\nגם פה אין',
        searchMode: 'number',
      } as any);

      expect(result.results).toEqual([]);
      expect(result.message).toBe('לא נמצאו מספרים תקינים בטקסט');
      expect(mockGoogleSheetsService.writeResults).not.toHaveBeenCalled();
    });

    it('should process mixed input and keep only lines with numbers', async () => {
      mockGoogleSheetsService.readSourceRows.mockResolvedValue(baseRows);
      mockGoogleSheetsService.writeResults.mockResolvedValue(undefined);

      await service.parseTextAndSearchExcel({
        text: ['בדיקה 7512846', 'אין פה מספר', 'עוד שורה 9182453', '9999999'].join('\n'),
        searchMode: 'number',
      } as any);

      expect(mockGoogleSheetsService.writeResults).toHaveBeenCalledWith([
        {
          identityNumber: '7512846',
          firstName: 'אל חי',
          lastName: 'אביטן',
          role: '',
          matchType: 'מספר',
          notes: null,
        },
        {
          identityNumber: '9182453',
          firstName: 'משה',
          lastName: 'בן נון',
          role: '',
          matchType: 'מספר',
          notes: null,
        },
        {
          identityNumber: '9999999',
          firstName: null,
          lastName: null,
          role: null,
          matchType: 'לא נמצא',
          notes: 'לא נמצא בגיליון',
        },
      ]);
    });

    it('should handle spaces and symbols around a number', async () => {
      mockGoogleSheetsService.readSourceRows.mockResolvedValue(baseRows);
      mockGoogleSheetsService.writeResults.mockResolvedValue(undefined);

      await service.parseTextAndSearchExcel({
        text: '***   7512846   !!!',
        searchMode: 'number',
      } as any);

      expect(mockGoogleSheetsService.writeResults).toHaveBeenCalledWith([
        {
          identityNumber: '7512846',
          firstName: 'אל חי',
          lastName: 'אביטן',
          role: '',
          matchType: 'מספר',
          notes: null,
        },
      ]);
    });
  });

  describe('performance', () => {
    it('should process 100 exact full-name lines and write 100 rows', async () => {
      mockGoogleSheetsService.readSourceRows.mockResolvedValue(baseRows);
      mockGoogleSheetsService.writeResults.mockResolvedValue(undefined);

      const text = Array(100).fill('אל חי אביטן').join('\n');

      const result = await service.parseTextAndSearchExcel({
        text,
        searchMode: 'name',
        pluga: "פלוגה מבצעית ב'",
      } as any);

      expect(result.results).toHaveLength(100);
      expect(mockGoogleSheetsService.writeResults).toHaveBeenCalledTimes(1);

      const writtenRows = mockGoogleSheetsService.writeResults.mock.calls[0][0];
      expect(writtenRows).toHaveLength(100);

      expect(writtenRows[0]).toEqual({
        identityNumber: '7512846',
        firstName: 'אל חי',
        lastName: 'אביטן',
        role: '',
        matchType: 'שם מלא',
        notes: null,
      });

      expect(writtenRows[99]).toEqual({
        identityNumber: '7512846',
        firstName: 'אל חי',
        lastName: 'אביטן',
        role: '',
        matchType: 'שם מלא',
        notes: null,
      });
    });
  });
});