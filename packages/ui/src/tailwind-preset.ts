import { colors, typography, radii, touchTargets } from './tokens.js';

export const carxTailwindPreset = {
  theme: {
    extend: {
      colors: {
        volt: colors.volt,
        asfalto: colors.asfalto,
        grafite: colors.grafite,
        aco: colors.aco,
        linha: colors.linha,
        texto: colors.texto,
        muted: colors.muted,
        nevoa: colors.nevoa,
        alert: colors.semantic.alert,
        info: colors.semantic.info,
        error: colors.semantic.error,
        success: colors.semantic.success,
      },
      fontFamily: {
        display: [typography.fontDisplay],
        body: [typography.fontBody],
      },
      borderRadius: {
        btn: radii.button,
        input: radii.input,
        card: radii.card,
        modal: radii.modal,
      },
      minHeight: {
        touchMobile: touchTargets.mobileTouchTargetMin,
        touchDesktop: touchTargets.desktopButtonMinHeight,
      },
    },
  },
};

export default carxTailwindPreset;

