/*
    SPDX-FileCopyrightText: 2018 Eon S. Jeon <esjeon@hyunmu.am>
    SPDX-FileCopyrightText: 2024 Vjatcheslav V. Kolchkov <akl334@protonmail.ch>

    SPDX-License-Identifier: MIT
*/

type percentType = number;
type Direction = "up" | "down" | "left" | "right";
type Position = "left" | "middle" | "right" | "upper" | "bottom" | "single";
function getOppositeDirection(direction: Direction): Direction {
  switch (direction) {
    case "right":
      return "left";
    case "left":
      return "right";
    case "up":
      return "down";
    case "down":
      return "up";
  }
}

const WindowState = {
  /* initial value */
  Unmanaged: 1,

  /* script-external state - overrides internal state */
  NativeFullscreen: 2,
  NativeMaximized: 3,

  /* script-internal state */
  Floating: 4,
  Maximized: 5,
  Tiled: 6,
  TiledAfloat: 7,
  Undecided: 8,
  Dragging: 9,
};
type WindowState = (typeof WindowState)[keyof typeof WindowState];
const WindowStateKeys = Object.keys(WindowState);
let windowStateStr = (state: WindowState) => {
  return WindowStateKeys[state - 1];
};

const Shortcut = {
  FocusNext: "FocusNext",
  FocusPrev: "FocusPrev",
  DWMLeft: "DWMLeft",
  DWMRight: "DWMRight",

  FocusUp: "FocusUp",
  FocusDown: "FocusDown",
  FocusLeft: "FocusLeft",
  FocusRight: "FocusRight",

  ShiftLeft: "ShiftLeft",
  ShiftRight: "ShiftRight",
  ShiftUp: "ShiftUp",
  ShiftDown: "ShiftDown",

  SwapUp: "SwapUp",
  SwapDown: "SwapDown",
  SwapLeft: "SwapLeft",
  SwapRight: "SwapRight",

  GrowWidth: "GrowWidth",
  GrowHeight: "GrowHeight",
  ShrinkWidth: "ShrinkWidth",
  ShrinkHeight: "ShrinkHeight",

  Increase: "Increase", // Used for gaps?
  Decrease: "Decrease", // Used for gaps?

  ToggleFloat: "ToggleFloat",
  SplitVertical: "SplitVertical", // Meta+V
  SplitHorizontal: "SplitHorizontal", // Meta+H

  // ToggleFloatAll: "ToggleFloatAll", // Removed
  // SetMaster: "SetMaster", // Removed
  // NextLayout: "NextLayout", // Removed
  // PreviousLayout: "PreviousLayout", // Removed
  // SetLayout: "SetLayout", // Removed

  // Rotate: "Rotate", // Removed
  // RotatePart: "RotatePart", // Removed

  // ToggleDock: "ToggleDock", // Removed

  // RaiseSurfaceCapacity: "RaiseSurfaceCapacity", // Removed
  // LowerSurfaceCapacity: "LowerSurfaceCapacity", // Removed

  // KrohnkiteMeta: "KrohnkiteMeta", // Removed meta mode

  /* Meta shortcuts removed for minimal build */
} as const;
type Shortcut = (typeof Shortcut)[keyof typeof Shortcut];

interface IShortcuts {
  getFocusNext(): ShortcutHandler;
  getFocusPrev(): ShortcutHandler;

  getFocusUp(): ShortcutHandler;
  getFocusDown(): ShortcutHandler;
  getFocusLeft(): ShortcutHandler;
  getFocusRight(): ShortcutHandler;

  getShiftDown(): ShortcutHandler;
  getShiftUp(): ShortcutHandler;
  getShiftLeft(): ShortcutHandler;
  getShiftRight(): ShortcutHandler;

  getGrowHeight(): ShortcutHandler;
  getShrinkHeight(): ShortcutHandler;
  getShrinkWidth(): ShortcutHandler;
  getGrowWidth(): ShortcutHandler;

  getIncrease(): ShortcutHandler;
  getDecrease(): ShortcutHandler;

  getToggleFloat(): ShortcutHandler;

  getSplitVertical(): ShortcutHandler;
  getSplitHorizontal(): ShortcutHandler;
}


interface IDBusQml {
  getDBusExists(): DBusCall;
  getDBusMoveMouseToFocus(): DBusCall;
  getDBusMoveMouseToCenter(): DBusCall;
}
interface IDBus {
  moveMouseToFocus(timeout?: number): void;
  moveMouseToCenter(timeout?: number): void;
}

const enum WinTypes {
  tiled = 1,
  docked = 2,
  float = 4,
  surfaces = 8,
  special = 16,
}

interface IConfig {
  //Geometry
  screenGapTop: number;
  screenGapLeft: number;
  screenGapBetween: number;
  screenGapRight: number;
  screenGapBottom: number;
  gapsOverrideConfig: string[]; // Keep for per-monitor gaps

  //Behavior
  movePointerOnFocus: boolean;
  defaultSplitOrientation: "horizontal" | "vertical";

  //Rules
  ignoreClass: string[];
  ignoreTitle: string[];
  ignoreRole: string[];

  floatingClass: string[];
  floatingTitle: string[];
  floatDefault: boolean;
  floatUtility: boolean;

  // Extra features
  preventMinimize: boolean;
  floatSkipPager: boolean;
  notificationDuration: number;

  // Meta
  metaIsToggle: boolean;
  metaIsPushedTwice: boolean;
  metaTimeout: number;
  metaConf: string[];
  defaultMetaConfig: { [key: string]: Shortcut };
}

interface IKrohnkiteMeta {
  state: boolean;
  lastPushed: number;
  toggleMode: boolean;
}

interface IDriverWindow {
  readonly fullScreen: boolean;
  readonly geometry: Readonly<Rect>;
  readonly id: string;
  readonly windowClassName: string;
  readonly maximized: boolean;
  readonly minimized: boolean;
  readonly shouldIgnore: boolean;
  readonly shouldFloat: boolean;
  readonly minSize: ISize;
  readonly maxSize: ISize;

  surface: ISurface;

  commit(geometry?: Rect, noBorder?: boolean, windowLayer?: WindowLayer): void;
  visible(srf: ISurface): boolean;
  getInitFloatGeometry(): Rect;
  moveMouseToFocus(): void;
}

interface ISurfaceStore {
  getSurface(
    output: Output,
    activity: string,
    vDesktop: VirtualDesktop,
  ): ISurface;
}

interface ISurface {
  capacity: number | null;
  output: Output;
  readonly id: string;
  readonly layoutId: string;
  readonly ignore: boolean;
  readonly workingArea: Readonly<Rect>;
  readonly activity: string;
  readonly vDesktop: VirtualDesktop;

  next(): ISurface | null;
  getParams(): [string, string, string];
}

interface IDriverContext {
  readonly backend: string;
  readonly currentSurfaces: ISurface[];
  readonly cursorPosition: [number, number] | null;

  currentSurface: ISurface;
  currentWindow: WindowClass | null;
  isMetaMode: boolean;

  setTimeout(func: () => void, timeout: number): void;
  showNotification(text: string): void;
  moveWindowsToScreen(windowsToScreen: [Output, WindowClass[]][]): void;
  moveToScreen(window: WindowClass, direction: Direction): boolean;
  moveToVDesktop(window: WindowClass, direction: Direction): boolean;
  focusSpecial(direction: Direction): boolean;
  focusNeighborWindow(
    direction: Direction,
    winTypes: WinTypes,
  ): Window | null | boolean;
  focusOutput(
    window: Window | null,
    direction: Direction,
    winTypes: WinTypes,
  ): boolean;
  focusVDesktop(
    window: Window | null,
    direction: Direction,
    winTypes: WinTypes,
  ): boolean;
  metaPushed(): void;
}

interface ILayoutClass {
  readonly id: string;
  new(capacity?: number | null): ILayout;
}

interface ILayout {
  /* read-only */
  readonly capacity?: number | null;
  readonly description: string;

  /* methods */
  adjust?(
    area: Rect,
    tiles: WindowClass[],
    basis: WindowClass,
    delta: RectDelta,
    gap: number,
  ): void;
  apply(
    ctx: EngineContext,
    tileables: WindowClass[],
    area: Rect,
    gap: number,
  ): void;
  handleShortcut?(ctx: EngineContext, input: Shortcut, data?: any): boolean;
  drag?(
    ctx: EngineContext,
    draggingRect: Rect,
    window: WindowClass,
    workingArea: Rect,
  ): boolean;

  toString(): string;
}

interface IGaps {
  left: number;
  right: number;
  top: number;
  bottom: number;
  between: number;
}

interface ISize {
  width: number;
  height: number;
}

// Logging
const LogModules = {
  newWindowAdded: "newWindowAdded",
  newWindowFiltered: "newWindowFiltered",
  newWindowUnmanaged: "newWindowUnmanaged",

  screensChanged: "screensChanged",
  virtualScreenGeometryChanged: "virtualScreenGeometryChanged",
  currentActivityChanged: "currentActivityChanged",
  currentDesktopChanged: "currentDesktopChanged",
  windowAdded: "windowAdded",
  windowActivated: "windowActivated",
  windowRemoved: "windowRemoved",
  surfaceChanged: "surfaceChanged",

  activitiesChanged: "activitiesChanged",
  bufferGeometryChanged: "bufferGeometryChanged",
  desktopsChanged: "desktopsChanged",
  fullScreenChanged: "fullScreenChanged",
  interactiveMoveResizeStepped: "interactiveMoveResizeStepped",
  maximizedAboutToChange: "maximizedAboutToChange",
  minimizedChanged: "minimizedChanged",
  moveResizedChanged: "moveResizedChanged",
  outputChanged: "outputChanged",
  shortcut: "shortcut",
  arrangeScreen: "arrangeScreen",
  printConfig: "printConfig",
  setTimeout: "setTimeout",
  window: "window",
  dbus: "dbus",
};
type LogModule = (typeof LogModules)[keyof typeof LogModules];

const LogPartitions = {
  newWindow: {
    number: 100,
    name: "newWindow",
    modules: [
      LogModules.newWindowAdded,
      LogModules.newWindowFiltered,
      LogModules.newWindowUnmanaged,
    ],
  },
  workspaceSignals: {
    number: 200,
    name: "workspaceSignal",
    modules: [
      LogModules.screensChanged,
      LogModules.virtualScreenGeometryChanged,
      LogModules.currentActivityChanged,
      LogModules.currentDesktopChanged,
      LogModules.windowAdded,
      LogModules.windowActivated,
      LogModules.windowRemoved,
      LogModules.surfaceChanged,
    ],
  },
  windowSignals: {
    number: 300,
    name: "windowSignal",
    modules: [
      LogModules.activitiesChanged,
      LogModules.bufferGeometryChanged,
      LogModules.desktopsChanged,
      LogModules.fullScreenChanged,
      LogModules.interactiveMoveResizeStepped,
      LogModules.maximizedAboutToChange,
      LogModules.minimizedChanged,
      LogModules.moveResizedChanged,
      LogModules.outputChanged,
    ],
  },
  other: {
    number: 1000,
    name: "other",
    modules: [
      LogModules.shortcut,
      LogModules.arrangeScreen,
      LogModules.printConfig,
      LogModules.setTimeout,
      LogModules.window,
      LogModules.dbus,
    ],
  },
} as const;
type LogPartition = (typeof LogPartitions)[keyof typeof LogPartitions];

interface ILogModules {
  send(
    module?: LogModule,
    action?: string,
    message?: string,
    filters?: ILogFilters,
  ): void;
  print(module?: LogModule, action?: string, message?: string): void;
  isModuleOn(module: LogModule): boolean;
}

interface ILogFilters {
  winClass?: string[] | null;
}

interface IFloatInit {
  windowWidth: number;
  windowHeight: number;
  randomize: boolean;
  randomWidth: number;
  randomHeight: number;
}

// Globals
let CONFIG: IConfig;
let LOG: ILogModules | undefined;
let DBUS: IDBus;
