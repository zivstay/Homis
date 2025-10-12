import { ConfigPlugin, withXcodeProject } from '@expo/config-plugins';
import { WidgetConfig } from './types';

const withWidgets: ConfigPlugin<WidgetConfig> = (config, options) => {
  return withXcodeProject(config, (config) => {
    const xcodeProject = config.modResults;
    
    // Add widget target
    const widgetTarget = xcodeProject.addTarget(
      'HomeisWidget',
      'app_extension',
      'HomeisWidget',
      'com.sarusiziv96.homeexpensemanager.HomeisWidget'
    );
    
    // Add widget files to project
    xcodeProject.addSourceFile(
      'HomeisWidget/HomeisWidget.swift',
      { target: widgetTarget.uuid }
    );
    
    xcodeProject.addSourceFile(
      'HomeisWidget/Info.plist',
      { target: widgetTarget.uuid }
    );
    
    // Configure widget target
    xcodeProject.addBuildPhase(
      [],
      'PBXSourcesBuildPhase',
      'Sources',
      widgetTarget.uuid
    );
    
    // Add widget to main app target dependencies
    const mainTarget = xcodeProject.getFirstTarget();
    if (mainTarget) {
      xcodeProject.addTargetDependency(mainTarget.uuid, [widgetTarget.uuid]);
    }
    
    return config;
  });
};

export default withWidgets;
