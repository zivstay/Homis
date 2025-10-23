const { withDangerousMod, withXcodeProject } = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

const withWidgets = (config) => {
  config = withWidgetFiles(config);
  config = withWidgetXcodeProject(config);
  config = withWidgetAppGroup(config);
  return config;
};

const withWidgetFiles = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const iosRoot = config.modRequest.platformProjectRoot;
      const widgetDir = path.join(iosRoot, 'HomeisWidget');
      
      // Create widget directory
      if (!fs.existsSync(widgetDir)) {
        fs.mkdirSync(widgetDir, { recursive: true });
      }
      
      // Copy widget files from backup
      const projectRoot = path.dirname(iosRoot);
      const backupDir = path.join(projectRoot, 'widget_backup');
      
      if (fs.existsSync(backupDir)) {
        const files = ['HomeisWidget.swift', 'HomeisWidgetBundle.swift', 'Info.plist'];
        files.forEach(file => {
          const source = path.join(backupDir, file);
          const dest = path.join(widgetDir, file);
          if (fs.existsSync(source)) {
            fs.copyFileSync(source, dest);
          }
        });
      }
      
      return config;
    },
  ]);
};

const withWidgetXcodeProject = (config) => {
  return withXcodeProject(config, (config) => {
    const xcodeProject = config.modResults;
    const bundleId = config.ios?.bundleIdentifier || 'com.sarusiziv96.homeexpensemanager';
    const widgetBundleId = `${bundleId}.HomeisWidget`;
    
    // Check if widget target already exists
    const targets = xcodeProject.pbxNativeTargetSection();
    let widgetExists = false;
    
    if (targets) {
      for (const key in targets) {
        if (targets[key].name === 'HomeisWidget') {
          widgetExists = true;
          break;
        }
      }
    }
    
    if (!widgetExists) {
      // Add widget target
      const widgetTarget = xcodeProject.addTarget(
        'HomeisWidget',
        'app_extension',
        'HomeisWidget',
        widgetBundleId
      );
      
      // Add widget files
      const widgetGroup = xcodeProject.addPbxGroup(
        ['HomeisWidget.swift', 'HomeisWidgetBundle.swift', 'Info.plist'],
        'HomeisWidget',
        'HomeisWidget'
      );
      
      xcodeProject.addSourceFile(
        'HomeisWidget/HomeisWidget.swift',
        { target: widgetTarget.uuid },
        widgetGroup.uuid
      );
      
      xcodeProject.addSourceFile(
        'HomeisWidget/HomeisWidgetBundle.swift',
        { target: widgetTarget.uuid },
        widgetGroup.uuid
      );
      
      // Add widget to main app dependencies
      const mainTarget = xcodeProject.getFirstTarget();
      if (mainTarget) {
        xcodeProject.addTargetDependency(mainTarget.uuid, [widgetTarget.uuid]);
      }
    }
    
    return config;
  });
};

const withWidgetAppGroup = (config) => {
  if (!config.ios) {
    config.ios = {};
  }
  
  if (!config.ios.entitlements) {
    config.ios.entitlements = {};
  }
  
  config.ios.entitlements['com.apple.security.application-groups'] = [
    'group.com.sarusiziv96.homeexpensemanager'
  ];
  
  return config;
};

module.exports = withWidgets;
