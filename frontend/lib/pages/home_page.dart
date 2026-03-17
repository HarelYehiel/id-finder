import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../services/api_service.dart';

class HomePage extends StatefulWidget {
  final String token;

  const HomePage({super.key, required this.token});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  final textController = TextEditingController();

  bool loading = false;

  String selectedSearchMode = 'number';
  String? selectedPluga;

  static final Uri _sheetUri = Uri.parse(
    'https://docs.google.com/spreadsheets/d/1C0CXS6TSci-V19pCjRFbW5n5BYjJnS8YOTVRkr5Ym8Y/edit?gid=533784239#gid=533784239',
  );

  final List<DropdownMenuItem<String>> searchModeItems = const [
    DropdownMenuItem(value: 'number', child: Text('לפי מספר אישי')),
    DropdownMenuItem(value: 'name', child: Text('לפי שם')),
  ];

  final List<String> plugot = [
    'מפקדת היחידה',
    "פלוגה מבצעית א'",
    "פלוגה מבצעית ב'",
    "פלוגה מבצעית ג'",
    'פלוגה מסייעת',
    'פלס"ם',
  ];

  bool get isNameMode => selectedSearchMode == 'name';

  @override
  void dispose() {
    textController.dispose();
    super.dispose();
  }

  Future<void> openSheet() async {
    final opened = await launchUrl(
      _sheetUri,
      mode: LaunchMode.externalApplication,
    );

    if (!opened && mounted) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('לא ניתן לפתוח את הגיליון')));
    }
  }

  void sendText() async {
    if (textController.text.trim().isEmpty) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text("יש להזין טקסט")));
      return;
    }

    if (isNameMode &&
        (selectedPluga == null || selectedPluga!.trim().isEmpty)) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text("יש לבחור פלוגה")));
      return;
    }

    setState(() {
      loading = true;
    });

    try {
      final success = await ApiService.sendText(
        token: widget.token,
        text: textController.text,
        searchMode: selectedSearchMode,
        pluga: isNameMode ? selectedPluga : null,
      );

      if (!mounted) return;

      setState(() {
        loading = false;
      });

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(success ? "השליחה בוצעה בהצלחה" : "השליחה נכשלה"),
        ),
      );
    } catch (e) {
      if (!mounted) return;

      setState(() {
        loading = false;
      });

      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text("אירעה שגיאה בשליחה")));
    }
  }

  void clearText() {
    textController.clear();
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return Scaffold(
      resizeToAvoidBottomInset: true,
      appBar: AppBar(
        title: const Text("Send Text"),
        actions: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
            child: ElevatedButton.icon(
              onPressed: openSheet,
              icon: const Icon(Icons.open_in_new, size: 18),
              label: const Text('פתח גיליון'),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.white,
                foregroundColor: Theme.of(context).primaryColor,
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
            ),
          ),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
          padding: EdgeInsets.fromLTRB(20, 20, 20, 20 + bottomInset),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              DropdownButtonFormField<String>(
                value: selectedSearchMode,
                decoration: const InputDecoration(
                  labelText: "בחר סוג חיפוש",
                  border: OutlineInputBorder(),
                ),
                items: searchModeItems,
                onChanged:
                    loading
                        ? null
                        : (value) {
                          if (value == null) return;

                          setState(() {
                            selectedSearchMode = value;
                            if (selectedSearchMode == 'number') {
                              selectedPluga = null;
                            }
                          });
                        },
              ),
              const SizedBox(height: 16),
              if (isNameMode) ...[
                DropdownButtonFormField<String>(
                  value: selectedPluga,
                  decoration: const InputDecoration(
                    labelText: "בחר פלוגה",
                    border: OutlineInputBorder(),
                  ),
                  items:
                      plugot
                          .map(
                            (pluga) => DropdownMenuItem<String>(
                              value: pluga,
                              child: Text(pluga),
                            ),
                          )
                          .toList(),
                  onChanged:
                      loading
                          ? null
                          : (value) {
                            setState(() {
                              selectedPluga = value;
                            });
                          },
                ),
                const SizedBox(height: 16),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.amber.shade100,
                    border: Border.all(color: Colors.amber.shade700),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Text(
                    'יש לרשום בכל שורה שם מלא בלבד, ללא מספר אישי, תפקיד או טקסט נוסף.\n'
                    'לדוגמה:\n'
                    'משה כהן\n'
                    'כהן משה',
                    textAlign: TextAlign.right,
                    style: TextStyle(fontSize: 14),
                  ),
                ),
                const SizedBox(height: 16),
              ],
              TextField(
                controller: textController,
                minLines: 12,
                maxLines: 18,
                textAlign: TextAlign.right,
                decoration: InputDecoration(
                  labelText: isNameMode ? "הדבק שמות כאן" : "הדבק טקסט כאן",
                  alignLabelWithHint: true,
                  border: const OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 20),
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton(
                      onPressed: loading ? null : sendText,
                      child: Text(loading ? "שולח..." : "שלח"),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: loading ? null : clearText,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.red,
                        foregroundColor: Colors.white,
                      ),
                      child: const Text("נקה"),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
