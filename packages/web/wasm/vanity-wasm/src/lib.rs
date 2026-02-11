use wasm_bindgen::prelude::*;
use ed25519_dalek::Keypair;
use rand::rngs::OsRng;
use js_sys::Uint8Array;

// =====================================================
// COPIED FROM vanity-wallet-generator/rust/src/main.rs
// =====================================================

const BASE58_ALPHABET: &str =
  "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

fn validate_pattern(pattern: &str, label: &str, case_sensitive: bool) -> Result<(), String> {
  if pattern.is_empty() {
    return Err(format!("{label} must be non-empty."));
  }

  if case_sensitive {
    for ch in pattern.chars() {
      if !BASE58_ALPHABET.contains(ch) {
        return Err(format!(
          "Invalid character \"{ch}\" in {label}. Base58 excludes 0, O, I, and l."
        ));
      }
    }
    return Ok(());
  }

  for ch in pattern.chars() {
    let is_digit = ('1'..='9').contains(&ch);
    let is_alpha = ch.is_ascii_alphabetic();
    if !is_digit && !is_alpha {
      return Err(format!(
        "Invalid {label}. Use only letters A-Z or a-z and digits 1-9 for case-insensitive matching."
      ));
    }
  }

  Ok(())
}

fn normalize_pattern(pattern: &str, case_sensitive: bool) -> String {
  if case_sensitive {
    pattern.to_string()
  } else {
    pattern.to_ascii_lowercase()
  }
}

fn matches_prefix_suffix(
  address: &str,
  prefix: Option<&str>,
  suffix: Option<&str>,
  case_sensitive: bool,
) -> bool {
  if case_sensitive {
    if let Some(prefix) = prefix {
      if !address.starts_with(prefix) {
        return false;
      }
    }
    if let Some(suffix) = suffix {
      if !address.ends_with(suffix) {
        return false;
      }
    }
    return true;
  }

  let normalized = address.to_ascii_lowercase();
  if let Some(prefix) = prefix {
    if !normalized.starts_with(prefix) {
      return false;
    }
  }
  if let Some(suffix) = suffix {
    if !normalized.ends_with(suffix) {
      return false;
    }
  }
  true
}

// =====================================================
// WASM-specific exports
// =====================================================

/// Validate a prefix pattern. Returns empty string if valid, error message if invalid.
#[wasm_bindgen]
pub fn wasm_validate_prefix(prefix: &str, case_sensitive: bool) -> String {
    match validate_pattern(prefix, "prefix", case_sensitive) {
        Ok(()) => String::new(),
        Err(e) => e,
    }
}

/// Validate a suffix pattern. Returns empty string if valid, error message if invalid.
#[wasm_bindgen]
pub fn wasm_validate_suffix(suffix: &str, case_sensitive: bool) -> String {
    match validate_pattern(suffix, "suffix", case_sensitive) {
        Ok(()) => String::new(),
        Err(e) => e,
    }
}

/// Core generation loop — runs in a Web Worker.
/// Generates keypairs in batches and checks for prefix/suffix match.
/// Returns a JsValue object: { found: bool, address?: string, secretKey?: Uint8Array }
///
/// Adapted from vanity CLI main.rs worker_loop — batch-based instead of infinite loop.
#[wasm_bindgen]
pub fn wasm_generate_batch(
    prefix: &str,
    suffix: &str,
    case_sensitive: bool,
    batch_size: u32,
) -> JsValue {
    let mut rng = OsRng {};
    let prefix_opt = if prefix.is_empty() { None } else { Some(normalize_pattern(prefix, case_sensitive)) };
    let suffix_opt = if suffix.is_empty() { None } else { Some(normalize_pattern(suffix, case_sensitive)) };

    for _ in 0..batch_size {
        let keypair = Keypair::generate(&mut rng);
        let address = bs58::encode(keypair.public.to_bytes()).into_string();

        if matches_prefix_suffix(
            &address,
            prefix_opt.as_deref(),
            suffix_opt.as_deref(),
            case_sensitive,
        ) {
            // Found! Return the keypair.
            let secret_bytes = keypair.to_bytes();
            let result = js_sys::Object::new();
            js_sys::Reflect::set(&result, &"found".into(), &true.into()).unwrap();
            js_sys::Reflect::set(&result, &"address".into(), &address.into()).unwrap();

            let secret_array = Uint8Array::new_with_length(64);
            secret_array.copy_from(&secret_bytes);
            js_sys::Reflect::set(&result, &"secretKey".into(), &secret_array.into()).unwrap();

            return result.into();
        }
    }

    // Not found in this batch
    let result = js_sys::Object::new();
    js_sys::Reflect::set(&result, &"found".into(), &false.into()).unwrap();
    result.into()
}
