/**
 * Map Firebase Auth error codes to user-facing messages.
 * Credential failures deliberately share one message so the form cannot be
 * used to find out which e-mail addresses have accounts.
 */
export function authErrorMessage(code, locale = "tr") {
  const tr = locale === "tr";
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
    case "auth/invalid-login-credentials":
      return tr ? "E-posta veya parola hatalı." : "Incorrect email or password.";
    case "auth/invalid-email":
      return tr ? "Geçerli bir e-posta adresi girin." : "Please enter a valid email address.";
    case "auth/email-already-in-use":
      return tr
        ? "Bu e-posta ile kayıt oluşturulamadı. Giriş yapmayı veya parolanızı sıfırlamayı deneyin."
        : "We couldn't create an account with this email. Try signing in instead.";
    case "auth/weak-password":
      return tr ? "Parola en az 6 karakter olmalıdır." : "Password must be at least 6 characters.";
    case "auth/too-many-requests":
      return tr ? "Çok fazla deneme yapıldı. Lütfen biraz bekleyip tekrar deneyin." : "Too many attempts. Please wait a moment and try again.";
    case "auth/network-request-failed":
      return tr ? "Ağ bağlantısı kurulamadı. Bağlantınızı kontrol edin." : "Network error. Check your connection.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return tr ? "Giriş penceresi kapatıldı." : "The sign-in window was closed.";
    case "auth/popup-blocked":
      return tr ? "Tarayıcı açılır pencereyi engelledi. Lütfen izin verip tekrar deneyin." : "The browser blocked the popup. Allow popups and try again.";
    case "auth/user-disabled":
      return tr ? "Bu hesap devre dışı bırakılmış." : "This account has been disabled.";
    default:
      return tr ? "İşlem başarısız oldu. Lütfen tekrar deneyin." : "Something went wrong. Please try again.";
  }
}
