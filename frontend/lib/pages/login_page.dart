import 'package:flutter/material.dart';
import '../services/api_service.dart';
import 'home_page.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final codeController = TextEditingController();
  final idController = TextEditingController();

  bool loading = false;

  Future<void> login() async {
    if (codeController.text.trim().isEmpty ||
        idController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("יש למלא קוד ומספר זהות")),
      );
      return;
    }

    setState(() {
      loading = true;
    });

    final token = await ApiService.login(
      codeController.text.trim(),
      idController.text.trim(),
    );

    if (!mounted) return;

    setState(() {
      loading = false;
    });

    if (token != null) {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => HomePage(token: token),
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("ההתחברות נכשלה")),
      );
    }
  }

  @override
  void dispose() {
    codeController.dispose();
    idController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Login")),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            TextField(
              controller: codeController,
              decoration: const InputDecoration(labelText: "Code"),
            ),
            TextField(
              controller: idController,
              decoration: const InputDecoration(labelText: "Identity Number"),
              keyboardType: TextInputType.number,
            ),
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: loading ? null : login,
              child: loading
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text("Login"),
            ),
          ],
        ),
      ),
    );
  }
}