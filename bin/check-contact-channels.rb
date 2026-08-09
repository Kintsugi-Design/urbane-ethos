#!/usr/bin/env ruby
require "json"

# Contact-channel drift gate.
#
# The centre has exactly one email address, two phone numbers and one WhatsApp
# number. They live in content/. Every literal `mailto:`, `tel:`, `wa.me/` and
# `+60…` in shipped markup must agree with them.
#
# This exists because the previous verification grep scanned only content/, so a
# stale `mailto:info@urbaneethos.center` sat in contact.html undetected while
# every other surface said urbaneethos@yahoo.com. The allowlist below is read
# from the content files and never written down here: a gate carrying its own
# copy of the address would reproduce the very drift it is meant to catch.

root = ARGV[0] || "."

def load_json(path)
  JSON.parse(File.read(path))
rescue Errno::ENOENT
  abort "File not found: #{path}"
rescue JSON::ParserError => e
  abort "Invalid JSON in #{path}: #{e.message}"
end

contact = load_json(File.join(root, "content/en/contact.json"))
common = load_json(File.join(root, "content/en/common.json"))
careers = load_json(File.join(root, "content/careers.json"))

# ---------------------------------------------------------------------------
# Allowlist, built from content
# ---------------------------------------------------------------------------

emails = [
  contact["email"],
  common.dig("footer", "email"),
  careers.dig("outro", "email")
].compact.map { |e| e.to_s.strip.downcase }.reject(&:empty?).uniq

phone_rows = Array(contact["phones"]).select { |p| p.is_a?(Hash) }
phones = (
  phone_rows.map { |p| p["number"] } +
  [common.dig("footer", "phone1"), common.dig("footer", "phone2")]
).compact.map { |n| n.to_s.strip }.reject(&:empty?).uniq

# Same rule as toE164() in assets/js/enquiry.js: strip every non-digit, then a
# leading 0 becomes the Malaysian country code.
def to_e164(display)
  digits = display.to_s.gsub(/\D/, "")
  return nil if digits.empty?
  digits.start_with?("0") ? "60#{digits[1..]}" : digits
end

phone_e164 = phones.map { |p| to_e164(p) }.compact.uniq

whatsapp_row = phone_rows.find { |p| p["label"].to_s =~ /whatsapp/i }
whatsapp_e164 = to_e164(whatsapp_row && whatsapp_row["number"])

abort "No email found in content (contact.email / common.footer.email)" if emails.empty?
abort "No phone numbers found in content (contact.phones / common.footer.phone*)" if phones.empty?

# ---------------------------------------------------------------------------
# Scan set
# ---------------------------------------------------------------------------

files = (
  Dir.glob(File.join(root, "*.html")) +
  [File.join(root, "content/blog/_post.html.erb")] +
  Dir.glob(File.join(root, "content/blog/posts/*.md"))
).select { |f| File.file?(f) }.sort

abort "No files to scan under #{root}" if files.empty?

EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/
MAILTO_RE = /mailto:([^"'\s>\)\]]*)/
TEL_RE = /tel:([^"'\s>\)\]]*)/
WAME_RE = %r{wa\.me/(\d+)}
# `+`-prefixed international literal. The character class excludes `+`, so two
# adjacent numbers are matched separately rather than as one blob.
PLUS_PHONE_RE = /\+\d[\d()\-. ]*\d/

# A value produced at runtime — `mailto:${data.outro.email}` (JS), `<%= … %>` or
# `mailto:#{post.email}` (ERB) — carries no literal to verify. Skipped, not
# failed.
def template?(value)
  value.include?("${") || value.include?("<%") || value.include?("\#{")
end

def strip_trailing_punctuation(value)
  value.sub(/[.,;:!?]+\z/, "")
end

problems = []
seen = {}

# One line per (file, offending literal): a markdown autolink renders the same
# bad address twice (href + link text) and that is one defect, not two. The
# suffix counts *distinct source lines*, so it stays honest when the mailto and
# bare-email sweeps both fire on the same literal.
def report(problems, seen, file, line_no, kind, literal, message)
  key = [file, kind, literal]
  if seen.key?(key)
    seen[key][:lines] << line_no
    return
  end
  entry = {lines: [line_no]}
  seen[key] = entry
  problems << {file: file, line: line_no, message: message, entry: entry}
end

files.each do |path|
  rel = path.sub(%r{\A\./}, "")
  File.readlines(path).each_with_index do |line, i|
    line_no = i + 1

    # 1 + 4. Email literals. A `mailto:` target *is* an email literal, so one
    # sweep covers both the linked and the bare case; whichever is seen first on
    # a given line wins and the duplicate is folded in by `report`.
    line.scan(MAILTO_RE) do
      target = strip_trailing_punctuation($1.to_s.split("?", 2).first.to_s)
      next if target.empty? || template?(target)
      addr = target.downcase
      next if emails.include?(addr)
      report(problems, seen, rel, line_no, "email", addr,
        "mailto: to non-allowlisted address #{target} (allowed: #{emails.join(", ")})")
    end

    line.scan(EMAIL_RE) do |match|
      addr = match.downcase
      next if emails.include?(addr)
      report(problems, seen, rel, line_no, "email", addr,
        "non-allowlisted email literal #{match} (allowed: #{emails.join(", ")})")
    end

    # 2. tel: targets. A local-format `tel:013…` is legitimate, so the
    # leading-0 rescue applies here.
    tel_targets = []
    line.scan(TEL_RE) do
      target = strip_trailing_punctuation($1.to_s)
      next if target.empty? || template?(target)
      tel_targets << target
      next if phone_e164.include?(to_e164(target))
      report(problems, seen, rel, line_no, "tel", target,
        "tel: to non-allowlisted number #{target} (allowed: #{phones.join(", ")})")
    end

    # 3. wa.me deep links must equal the derived WhatsApp E.164 exactly.
    line.scan(WAME_RE) do
      digits = $1
      next if whatsapp_e164 && digits == whatsapp_e164
      expected = whatsapp_e164 || "(no WhatsApp row in content/en/contact.json)"
      report(problems, seen, rel, line_no, "wa.me", digits,
        "wa.me/#{digits} does not match the derived WhatsApp number #{expected}")
    end

    # 5. `+`-prefixed literals are fully qualified by definition, so no
    # leading-0 rescue: the digits must already match an allowlisted number as
    # written. This is what catches a dropped or mistyped country code — under
    # the tel: rule a leading-zero literal would launder into a valid number.
    line.scan(PLUS_PHONE_RE) do |match|
      digits = match.gsub(/\D/, "")
      next unless digits.length.between?(7, 15) # not phone-shaped
      next if phone_e164.include?(digits)
      # Already reported by the tel: rule — one defect, one line.
      next if tel_targets.any? { |t| t.include?(match) }
      report(problems, seen, rel, line_no, "phone", digits,
        "malformed phone literal #{match.strip} (allowed: #{phones.join(", ")})")
    end
  end
end

if problems.empty?
  puts "contact channels OK (#{files.size} files, #{emails.size} email(s), #{phones.size} number(s))"
  exit 0
else
  problems.each do |p|
    lines = p[:entry][:lines].uniq
    more = lines.size > 1 ? " (also line #{lines[1..].join(", ")})" : ""
    warn "#{p[:file]}:#{p[:line]}: #{p[:message]}#{more}"
  end
  warn "\n#{problems.size} contact-channel issue(s)"
  exit 1
end
