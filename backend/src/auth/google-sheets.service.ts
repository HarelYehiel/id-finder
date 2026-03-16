import { Injectable } from '@nestjs/common';
import { google, sheets_v4 } from 'googleapis';
import { Mutex } from 'async-mutex';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleSheetsService {
  private readonly spreadsheetId = '1C0CXS6TSci-V19pCjRFbW5n5BYjJnS8YOTVRkr5Ym8Y';
  private readonly outputSheetName = 'Output';
  private readonly sourceSheetName = 'Data';
  private readonly writeMutex = new Mutex();

  constructor(private configService: ConfigService) {}

  private async getSheetsClient(): Promise<sheets_v4.Sheets> {
    const auth = new google.auth.JWT({
      email: this.configService.get<string>('GOOGLE_CLIENT_EMAIL'),
      key: this.configService
        .get<string>('GOOGLE_PRIVATE_KEY')
        ?.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    return google.sheets({
      version: 'v4',
      auth,
    });
  }

  private async getSheetId(sheets: sheets_v4.Sheets): Promise<number> {
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: this.spreadsheetId,
    });

    const targetSheet = spreadsheet.data.sheets?.find(
      (sheet) => sheet.properties?.title === this.outputSheetName,
    );

    if (
      targetSheet?.properties?.sheetId === undefined ||
      targetSheet?.properties?.sheetId === null
    ) {
      throw new Error(`לא נמצא גיליון בשם ${this.outputSheetName}`);
    }

    return targetSheet.properties.sheetId;
  }

  private async getNextBlockStartRow(sheets: sheets_v4.Sheets): Promise<number> {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${this.outputSheetName}!A:G`,
    });

    const values = response.data.values ?? [];

    if (values.length === 0) {
      return 1;
    }

    let lastNonEmptyRow = 0;

    for (let i = 0; i < values.length; i++) {
      const row = values[i] ?? [];
      const hasContent = row.some(
        (cell) => cell !== undefined && String(cell).trim() !== '',
      );

      if (hasContent) {
        lastNonEmptyRow = i + 1;
      }
    }

    return lastNonEmptyRow + 2;
  }

  private getIsraelDateTimeText(): string {
    const now = new Date();

    const israelDateTime = now.toLocaleString('he-IL', {
      timeZone: 'Asia/Jerusalem',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    return `דוח נוצר בתאריך ${israelDateTime}`;
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

  async readSourceRows(): Promise<
    Array<{
      id: string;
      firstName: string;
      lastName: string;
      pluga: string;
      role: string;
    }>
  > {
    const sheets = await this.getSheetsClient();

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${this.sourceSheetName}!A:G`,
    });

    const values = response.data.values ?? [];

    if (values.length <= 1) {
      return [];
    }

    const dataRows = values.slice(1);

    return dataRows.map((row) => ({
      id: String(row[0] ?? '').trim().replace('.0', '').replace(/\s/g, ''),
      firstName: this.fixHebrew(row[1] ?? ''),
      lastName: this.fixHebrew(row[2] ?? ''),
      pluga: this.fixHebrew(row[3] ?? ''),
      role: this.fixHebrew(row[6] ?? ''),
    }));
  }

  async writeResults(
    rows: Array<{
      identityNumber: string | null;
      firstName: string | null;
      lastName: string | null;
      role: string | null;
      matchType: string | null;
      notes: string | null;
    }>,
  ): Promise<void> {
    if (rows.length === 0) {
      return;
    }

    await this.writeMutex.runExclusive(async () => {
      const sheets = await this.getSheetsClient();
      const sheetId = await this.getSheetId(sheets);

      const blockStartRow = await this.getNextBlockStartRow(sheets);

      const yellowRow = blockStartRow;
      const groupHeaderRow = blockStartRow + 1;
      const tableHeaderRow = blockStartRow + 2;
      const dataStartRow = blockStartRow + 3;
      const driverNoteRow = dataStartRow + rows.length;
      const dataEndRow = driverNoteRow;

      const yellowHeaderText = this.getIsraelDateTimeText();

      await sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${this.outputSheetName}!A${yellowRow}:G${tableHeaderRow}`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [
            [yellowHeaderText, '', '', '', '', '', ''],
            ['רכב -', '', '', 'צ -', '', '', ''],
            ['מס"ד', 'מ.א', 'שם פרטי', 'שם משפחה', 'תפקיד', 'הערות', 'סוג התאמה'],
          ],
        },
      });

      const values = [
        ...rows.map((row, index) => [
          index + 1,
          row.identityNumber ?? '',
          row.firstName ?? '',
          row.lastName ?? '',
          row.role ?? '',
          row.notes ?? '',
          row.matchType ?? '',
        ]),
        ['', '', '', '', '', 'נהג', ''],
      ];

      await sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${this.outputSheetName}!A${dataStartRow}:G${dataEndRow}`,
        valueInputOption: 'RAW',
        requestBody: {
          values,
        },
      });

      const requests: sheets_v4.Schema$Request[] = [
        {
          unmergeCells: {
            range: {
              sheetId,
              startRowIndex: yellowRow - 1,
              endRowIndex: groupHeaderRow,
              startColumnIndex: 0,
              endColumnIndex: 7,
            },
          },
        },
        {
          mergeCells: {
            range: {
              sheetId,
              startRowIndex: yellowRow - 1,
              endRowIndex: yellowRow,
              startColumnIndex: 0,
              endColumnIndex: 6, // A:F
            },
            mergeType: 'MERGE_ALL',
          },
        },
        {
          mergeCells: {
            range: {
              sheetId,
              startRowIndex: groupHeaderRow - 1,
              endRowIndex: groupHeaderRow,
              startColumnIndex: 0,
              endColumnIndex: 3, // A:C
            },
            mergeType: 'MERGE_ALL',
          },
        },
        {
          mergeCells: {
            range: {
              sheetId,
              startRowIndex: groupHeaderRow - 1,
              endRowIndex: groupHeaderRow,
              startColumnIndex: 3,
              endColumnIndex: 6, // D:F
            },
            mergeType: 'MERGE_ALL',
          },
        },

        // שורה צהובה
        {
          repeatCell: {
            range: {
              sheetId,
              startRowIndex: yellowRow - 1,
              endRowIndex: yellowRow,
              startColumnIndex: 0,
              endColumnIndex: 6, // A:F
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: {
                  red: 1,
                  green: 1,
                  blue: 0,
                },
                horizontalAlignment: 'CENTER',
                textFormat: {
                  bold: true,
                  fontSize: 36,
                  fontFamily: 'Arial',
                  foregroundColor: { red: 0, green: 0, blue: 0 },
                },
              },
            },
            fields:
              'userEnteredFormat.backgroundColor,userEnteredFormat.horizontalAlignment,userEnteredFormat.textFormat',
          },
        },

        // שורת רכב/צ
        {
          repeatCell: {
            range: {
              sheetId,
              startRowIndex: groupHeaderRow - 1,
              endRowIndex: groupHeaderRow,
              startColumnIndex: 0,
              endColumnIndex: 6, // A:F
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: {
                  red: 0.85,
                  green: 0.85,
                  blue: 0.85,
                },
                horizontalAlignment: 'CENTER',
                textFormat: {
                  bold: true,
                  fontSize: 20,
                  fontFamily: 'Arial',
                },
              },
            },
            fields:
              'userEnteredFormat.backgroundColor,userEnteredFormat.horizontalAlignment,userEnteredFormat.textFormat',
          },
        },

        // שורת כותרות הטבלה
        {
          repeatCell: {
            range: {
              sheetId,
              startRowIndex: tableHeaderRow - 1,
              endRowIndex: tableHeaderRow,
              startColumnIndex: 0,
              endColumnIndex: 7,
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: {
                  red: 1,
                  green: 1,
                  blue: 1,
                },
                horizontalAlignment: 'CENTER',
                textFormat: {
                  bold: true,
                  fontSize: 22,
                  fontFamily: 'Arial',
                },
              },
            },
            fields:
              'userEnteredFormat.backgroundColor,userEnteredFormat.horizontalAlignment,userEnteredFormat.textFormat',
          },
        },

        // שורות הנתונים + נהג
        {
          repeatCell: {
            range: {
              sheetId,
              startRowIndex: dataStartRow - 1,
              endRowIndex: dataEndRow,
              startColumnIndex: 0,
              endColumnIndex: 7,
            },
            cell: {
              userEnteredFormat: {
                horizontalAlignment: 'CENTER',
                textFormat: {
                  fontSize: 20,
                  fontFamily: 'Arial',
                },
              },
            },
            fields:
              'userEnteredFormat.horizontalAlignment,userEnteredFormat.textFormat',
          },
        },

        // גבולות
        {
          updateBorders: {
            range: {
              sheetId,
              startRowIndex: yellowRow - 1,
              endRowIndex: dataEndRow,
              startColumnIndex: 0,
              endColumnIndex: 7,
            },
            top: {
              style: 'SOLID',
              width: 1,
              color: { red: 0, green: 0, blue: 0 },
            },
            bottom: {
              style: 'SOLID',
              width: 1,
              color: { red: 0, green: 0, blue: 0 },
            },
            left: {
              style: 'SOLID',
              width: 1,
              color: { red: 0, green: 0, blue: 0 },
            },
            right: {
              style: 'SOLID',
              width: 1,
              color: { red: 0, green: 0, blue: 0 },
            },
            innerHorizontal: {
              style: 'SOLID',
              width: 1,
              color: { red: 0, green: 0, blue: 0 },
            },
            innerVertical: {
              style: 'SOLID',
              width: 1,
              color: { red: 0, green: 0, blue: 0 },
            },
          },
        },

        // רוחב עמודות
        {
          updateDimensionProperties: {
            range: {
              sheetId,
              dimension: 'COLUMNS',
              startIndex: 0,
              endIndex: 7,
            },
            properties: {
              pixelSize: 160,
            },
            fields: 'pixelSize',
          },
        },
      ];

      // צביעת סוג התאמה בלבד בעמודה G
      rows.forEach((row, index) => {
        const rowIndex = dataStartRow + index - 1;

        let color: { red: number; green: number; blue: number } | null = null;

        if (
          row.matchType === 'התאמה חלקית' ||
          row.matchType === 'כינוי' ||
          row.matchType === 'לא חד משמעי'
        ) {
          color = { red: 1, green: 1, blue: 0 };
        }

        if (row.matchType === 'לא נמצא') {
          color = { red: 1, green: 0.6, blue: 0.6 };
        }

        if (color) {
          requests.push({
            repeatCell: {
              range: {
                sheetId,
                startRowIndex: rowIndex,
                endRowIndex: rowIndex + 1,
                startColumnIndex: 6,
                endColumnIndex: 7,
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: color,
                },
              },
              fields: 'userEnteredFormat.backgroundColor',
            },
          });
        }
      });

      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: {
          requests,
        },
      });
    });
  }
}