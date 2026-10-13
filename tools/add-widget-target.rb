# Legt im Xcode-Projekt das Widget-Ziel „CalcumeterWidgets“ an (einmalig; ersetzt die Handarbeit in Xcode).
#   gem install xcodeproj && ruby tools/add-widget-target.rb
require 'xcodeproj'

root = File.expand_path('..', __dir__)
project = Xcodeproj::Project.open(File.join(root, 'ios/App/App.xcodeproj'))
NAME = 'CalcumeterWidgets'
abort "#{NAME} gibt es schon" if project.targets.any? { |t| t.name == NAME }

app = project.targets.find { |t| t.name == 'App' }
widget = project.new_target(:app_extension, NAME, :ios, '15.0', nil, :swift)

group = project.main_group.find_subpath('WidgetSource', true)
group.set_source_tree('<group>')
group.set_path('WidgetSource')
swift = group.new_reference('CalcumeterWidgets.swift')
group.new_reference('Info.plist')
group.new_reference('CalcumeterWidgets.entitlements')
widget.add_file_references([swift])
%w[WidgetKit SwiftUI].each { |fw| widget.add_system_framework(fw) }

widget.build_configurations.each do |c|
  s = c.build_settings
  s['PRODUCT_NAME'] = NAME
  s['PRODUCT_BUNDLE_IDENTIFIER'] = 'com.almaz6380.calcumeter.widgets'
  s['INFOPLIST_FILE'] = 'WidgetSource/Info.plist'
  s['CODE_SIGN_ENTITLEMENTS'] = 'WidgetSource/CalcumeterWidgets.entitlements'
  s['CODE_SIGN_STYLE'] = 'Automatic'
  s['SWIFT_VERSION'] = '5.0'
  s['IPHONEOS_DEPLOYMENT_TARGET'] = '15.0'
  s['TARGETED_DEVICE_FAMILY'] = '1,2'
  s['MARKETING_VERSION'] = '1.0'
  s['CURRENT_PROJECT_VERSION'] = '1'
  s['SKIP_INSTALL'] = 'YES'
  s['LD_RUNPATH_SEARCH_PATHS'] = ['$(inherited)', '@executable_path/Frameworks', '@executable_path/../../Frameworks']
  s['GENERATE_INFOPLIST_FILE'] = 'NO'
  s['ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME'] = ''
  s['ASSETCATALOG_COMPILER_WIDGET_BACKGROUND_COLOR_NAME'] = ''
end

# In die App einbetten
app.add_dependency(widget)
embed = app.new_copy_files_build_phase('Embed Foundation Extensions')
embed.symbol_dst_subfolder_spec = :plug_ins
build_file = embed.add_file_reference(widget.product_reference, true)
build_file.settings = { 'ATTRIBUTES' => ['RemoveHeadersOnCopy'] }

project.save
puts "#{NAME} angelegt"
