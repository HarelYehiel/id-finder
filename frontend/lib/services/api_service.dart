import 'dart:convert';
import 'package:http/http.dart' as http;

class ApiService {
  static const String baseUrl = "http://localhost:3001";

  static Future<String?> login(String code, String identityNumber) async {
    try {
      final response = await http
          .post(
            Uri.parse("$baseUrl/auth/login"),
            headers: {"Content-Type": "application/json"},
            body: jsonEncode({"code": code, "identityNumber": identityNumber}),
          )
          .timeout(const Duration(seconds: 15));

      print("login status: ${response.statusCode}");
      print("login body: ${response.body}");

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = jsonDecode(response.body);
        return data["access_token"];
      }

      return null;
    } catch (e) {
      print("login error: $e");
      return null;
    }
  }

  static Future<bool> sendText(String token, String text) async {
    try {
      final response = await http
          .post(
            Uri.parse("$baseUrl/auth/parse-text"),
            headers: {
              "Content-Type": "application/json",
              "Authorization": "Bearer $token",
            },
            body: jsonEncode({"text": text}),
          )
          .timeout(const Duration(seconds: 15));

      print("sendText status: ${response.statusCode}");
      print("sendText body: ${response.body}");

      return response.statusCode == 200 || response.statusCode == 201;
    } catch (e) {
      print("sendText error: $e");
      return false;
    }
  }
}
