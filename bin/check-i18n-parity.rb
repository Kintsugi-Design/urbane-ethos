#!/usr/bin/env ruby
require "json"

en_dir = ARGV[0] || "content/en"
ms_dir = ARGV[1] || "content/ms"

def walk_keys(obj, prefix = "")
  case obj
  when Hash
    obj.flat_map do |k, v|
      next [] if k == "_meta" || k == "_draft"
      path = prefix.empty? ? k.to_s : "#{prefix}.#{k}"
      [path] + walk_keys(v, path)
    end
  else
    []
  end
end

def load_keys(dir)
  unless Dir.exist?(dir)
    abort "Directory not found: #{dir}"
  end

  Dir.glob(File.join(dir, "*.json")).each_with_object({}) do |path, acc|
    name = File.basename(path, ".json")
    data = JSON.parse(File.read(path))
    acc[name] = walk_keys(data).sort
  end
end

en = load_keys(en_dir)
ms = load_keys(ms_dir)

problems = []

(en.keys | ms.keys).sort.each do |file|
  en_keys = en[file] || []
  ms_keys = ms[file] || []

  only_en = en_keys - ms_keys
  only_ms = ms_keys - en_keys

  only_en.each { |k| problems << "#{file}.json: missing in ms/: #{k}" }
  only_ms.each { |k| problems << "#{file}.json: missing in en/: #{k}" }
end

if problems.empty?
  puts "i18n parity OK (#{en.keys.size} files)"
  exit 0
else
  problems.each { |p| warn p }
  warn "\n#{problems.size} parity issue(s)"
  exit 1
end
