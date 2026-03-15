import 'package:flutter/material.dart';
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

  @override
  void dispose() {
    textController.dispose();
    super.dispose();
  }

  void sendText() async {
    setState(() {
      loading = true;
    });

    final success = await ApiService.sendText(
      widget.token,
      textController.text,
    );

    setState(() {
      loading = false;
    });

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(success ? "Sent successfully" : "Failed")),
    );
  }

  void clearText() {
    textController.clear();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Send Text")),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            TextField(
              controller: textController,
              maxLines: 10,
              decoration: const InputDecoration(
                labelText: "Paste text here",
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 20),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton(
                    onPressed: loading ? null : sendText,
                    child: const Text("Send"),
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
                    child: const Text("Clear"),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
