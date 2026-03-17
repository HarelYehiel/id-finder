import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:package_info_plus/package_info_plus.dart';

class ApiService {
  static const String localUrl = "http://localhost:3001";
  static const String prodUrl =
      "https://id-finder-backend-1027747272782.europe-west1.run.app";

  static const String baseUrl = prodUrl;

  static Future<String> _getBuildNumber() async {
    final packageInfo = await PackageInfo.fromPlatform();
    return packageInfo.buildNumber;
  }

  static Future<String?> login(String code, String identityNumber) async {
    try {
      final buildNumber = await _getBuildNumber();

      final response = await http
          .post(
            Uri.parse("$baseUrl/auth/login"),
            headers: {
              "Content-Type": "application/json",
              "X-App-Build": buildNumber,
            },
            body: jsonEncode({"code": code, "identityNumber": identityNumber}),
          )
          .timeout(const Duration(seconds: 15));

      print("login status: ${response.statusCode}");
      print("login body: ${response.body}");

      if (response.statusCode == 426) {
        throw Exception("APP_UPDATE_REQUIRED");
      }

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = jsonDecode(response.body);
        return data["access_token"];
      }

      return null;
    } catch (e) {
      print("login error: $e");
      rethrow;
    }
  }

  static Future<bool> sendText({
    required String token,
    required String text,
    required String searchMode,
    String? pluga,
  }) async {
    try {
      final buildNumber = await _getBuildNumber();

      final response = await http
          .post(
            Uri.parse("$baseUrl/auth/parse-text"),
            headers: {
              "Content-Type": "application/json",
              "Authorization": "Bearer $token",
              "X-App-Build": buildNumber,
            },
            body: jsonEncode({
              "text": text,
              "searchMode": searchMode,
              "pluga": pluga,
            }),
          )
          .timeout(const Duration(seconds: 15));

      print("sendText status: ${response.statusCode}");
      print("sendText body: ${response.body}");

      if (response.statusCode == 426) {
        throw Exception("APP_UPDATE_REQUIRED");
      }

      return response.statusCode == 200 || response.statusCode == 201;
    } catch (e) {
      print("sendText error: $e");
      rethrow;
    }
  }
}
