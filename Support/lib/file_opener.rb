#!/usr/bin/env ruby -wKU

require 'erb'
require 'uri'
require 'singleton'

class Finder
  include Singleton
  
  def run(args)
    @debug_info = ""
    command, arg = args
    puts "Unknown command: #{command}" and return unless Constants::COMMANDS.include?(command)
    case command
    when /^open\-(.+)/
      self.opener($1)
    when /^find\-(.+)/
      self.finder($1, arg)
    when /^run\-(.+)/
      self.runner($1, arg)
    end
  end
  
  def asset_path(file = nil, html = false)
    res =file.nil? ?
      File.join(Constants::SUPPORT_PATH, "assets") :
      File.join(Constants::SUPPORT_PATH, "assets", file)
    res.gsub!(' ', '%20') if html
    res
  end
  
protected
  module Constants
    ENTITIES = %w{controller model view helper}
    
    ENTITIES_AND_TESTS = ENTITIES +
      ENTITIES.map { |e| "#{e}-test"} +
      ["lib"]
  
    COMMANDS = ENTITIES_AND_TESTS.map { |e| "find-#{e}" } +
      ENTITIES_AND_TESTS.map { |e| "open-#{e}" } +
      ENTITIES_AND_TESTS.map { |e| "run-#{e}" }

    PROJECT_PATH = ENV['TM_PROJECT_DIRECTORY'] || ENV['TM_DIRECTORY'] || ENV['TM_FILEPATH'] && File.dirname(ENV['TM_FILEPATH'])
    SUPPORT_PATH = ENV['TM_BUNDLE_SUPPORT']
    RUBY_PATH    = ENV['TM_RUBY'] || 'ruby'

    PATHES = {
      "controller"      => "app/controllers",
      "model"           => "app/models",
      "view"            => "app/views",
      "helper"          => "app/helpers",
      "controller-test" => File.directory?(File.join(PROJECT_PATH, "test/functional")) ? "test/functional" : "spec/controllers",
      "model-test"      => File.directory?(File.join(PROJECT_PATH, "test/unit")) ? "test/unit" : "spec/models",
      "view-test"       => "spec/views",
      "helper-test"     => "spec/helpers",
      "lib"             => "lib",
    }
  end

  def collect_files!(mask)
    path = File.join(self.targer_path, "**", mask)
    @files = Dir.glob(path).reject do |f|
      File.directory?(f)
    end.map do |f|
      tmp = f.gsub(%r{^#{self.targer_path}/}, "")
      [tmp, tmp]
    end
  end
  
  def collect_files2!(regex)
    @debug_info = regex.to_s
    path = File.join(self.targer_path, "**", "*")
    @files = Dir.glob(path).reject do |f|
      File.directory?(f)
    end.map do |f|
      tmp = f.gsub(%r{^#{self.targer_path}/}, "")
    end.reject do |f|
      !(f.match(regex))
    end.map do |f|
      m = f.match(regex)
      res = []
      m.captures.each_with_index do |c, i|
        wrap = !(i % 2).zero?
        res << (wrap ? "<span style='font-weight: bold; color: #000000'>#{c}</span>" : c)
      end
      [res.join, f]
    end
  end
  
  def reg(str = nil)
    regex_str = (str.nil? || str.empty?) ?
      "(.*)" :
      %Q{^(.*)#{str.split('').map { |f| "(#{Regexp.escape(f)})" }.join('(.*)')}(.*)$}
    Regexp.new(regex_str, Regexp::IGNORECASE)
  end
  
  def targer_path
    File.join(Constants::PROJECT_PATH, Constants::PATHES[@target])
  end
  
  def mask(str = nil)
    (str.nil? || str.empty?) ? "*" : %{*#{str.split('').join("*")}*}
  end

  def opener(object)
    main_html_file = asset_path('opener.html.erb')
    files_partial_file = asset_path('/_files.html.erb')
    @target = object
    # self.collect_files!(self.mask)
    self.collect_files2!(self.reg)
    @files_partial = ERB.new(File.read(files_partial_file)).result(binding)
    puts ERB.new(File.read(main_html_file)).result(binding)
  end
  
  def finder(object, query)
    files_partial_file = asset_path('/_files.html.erb')
    @target = object
    # self.collect_files!(self.mask(query))
    self.collect_files2!(self.reg(query))
    res = ERB.new(File.read(files_partial_file)).result(binding)
    puts res
  end
  
  def runner(object, filename)
    @target = object
    to_open = File.join(self.targer_path, filename)
    self.open_file(to_open)
  end
  
  def open_url(url)
    `open "#{url}"`
  end

  # Open a file in textmate using the txmt:// protocol.  Uses 0-based line and column indices.
  def open_file(filename, line_number = nil, column_number = nil)
    options = []
    options << "url=file://#{URI.escape(filename)}"
    options << "line=#{line_number + 1}" if line_number
    options << "column=#{column_number + 1}" if column_number
    open_url "txmt://open?" + options.join("&")
  end
end

Finder.instance.run(ARGV)
