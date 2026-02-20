/*
    SPDX-FileCopyrightText: 2018 Eon S. Jeon <esjeon@hyunmu.am>
    SPDX-FileCopyrightText: 2024 Vjatcheslav V. Kolchkov <akl334@protonmail.ch>

    SPDX-License-Identifier: MIT
*/

class WindowClass {
  public static isTileableState(state: WindowState): boolean {
    return (
      state === WindowState.Dragging ||
      state === WindowState.Tiled ||
      state === WindowState.Maximized ||
      state === WindowState.TiledAfloat
    );
  }

  public static isTiledState(state: WindowState): boolean {
    return state === WindowState.Tiled || state === WindowState.Maximized;
  }

  public static isFloatingState(state: WindowState): boolean {
    return state === WindowState.Floating || state === WindowState.TiledAfloat;
  }

  public readonly id: string;
  public readonly window: IDriverWindow;

  public get actualGeometry(): Readonly<Rect> {
    return this.window.geometry;
  }
  public get shouldFloat(): boolean {
    return this.window.shouldFloat;
  }
  public get shouldIgnore(): boolean {
    return this.window.shouldIgnore;
  }

  public get isTileable(): boolean {
    return WindowClass.isTileableState(this.state);
  }

  public get isTiled(): boolean {
    return WindowClass.isTiledState(this.state);
  }

  public get isFloating(): boolean {
    return WindowClass.isFloatingState(this.state);
  }

  public get geometryDelta(): RectDelta | null {
    if (this.geometry === this.actualGeometry) return null;
    return RectDelta.fromRects(this.geometry, this.actualGeometry);
  }

  public get minSize(): ISize { // Explicit return type ISize
    return this._minSize;
  }
  public get maxSize(): ISize { // Explicit return type ISize
    return this._maxSize;
  }

  public get state(): WindowState {
    if (this.window.fullScreen) return WindowState.NativeFullscreen;
    if (this.window.maximized) return WindowState.NativeMaximized;
    return this.internalState;
  }

  public set state(value: WindowState) {
    const state = this.state;
    if (state === value || state === WindowState.Dragging) return;

    if (
      (state === WindowState.Unmanaged || WindowClass.isTileableState(state)) &&
      WindowClass.isFloatingState(value)
    )
      this.shouldCommitFloat = true;
    else if (
      WindowClass.isFloatingState(state) &&
      WindowClass.isTileableState(value)
    )
      this._floatGeometry = this.actualGeometry;

    this.internalState = value;
  }

  public setDraggingState() {
    this.internalState = WindowState.Dragging;
  }
  public setState(value: WindowState) {
    this.internalState = value;
  }

  public get surface(): ISurface {
    return this.window.surface;
  }

  public set surface(srf: ISurface) {
    this.window.surface = srf;
  }

  public get weight(): number {
    const srfID = this.window.surface.id;
    const weight: number | undefined = this.weightMap[srfID];
    if (weight === undefined) {
      this.weightMap[srfID] = 1.0;
      return 1.0;
    }
    return weight;
  }

  public set weight(value: number) {
    const srfID = this.window.surface.id;
    this.weightMap[srfID] = value;
  }

  public get windowClassName(): string {
    return this.window.windowClassName;
  }

  public get floatGeometry(): Rect {
    if (this._floatGeometry === null) {
      // Default float geometry logic since CONFIG.floatInit is removed
      // Use a reasonable default or the window's current geometry
      this._floatGeometry = new Rect(0, 0, 800, 600); // Temporary default
    }
    return this._floatGeometry;
  }
  public set floatGeometry(value: Rect) {
    this._floatGeometry = value;
  }

  public geometry: Rect;
  public timestamp: number;

  private internalState: WindowState;
  private shouldCommitFloat: boolean;
  private weightMap: { [key: string]: number };
  private _minSize: ISize;
  private _maxSize: ISize;
  private _floatGeometry: Rect | null;

  constructor(window: IDriverWindow) {
    this.id = window.id;
    this.window = window;

    this.geometry = window.geometry;
    this.timestamp = 0;

    this.internalState = WindowState.Unmanaged;
    this.shouldCommitFloat = this.shouldFloat;
    // floatInit removed, defaulting to null/current geometry behavior logic
    this._floatGeometry = this.shouldCommitFloat ? this.geometry : null;
    this.weightMap = {};

    this._minSize = window.minSize;
    this._maxSize = window.maxSize;
  }

  public toString(): string {
    return `Window: id=${this.id}, state: ${windowStateStr(this.state)}. ${this.window}`;
  }

  public commit(noBorders?: boolean) {
    const state = this.state;
    // Log calls removed or simplified if LogModules not available?
    // Assuming LOG global exists.

    switch (state) {
      case WindowState.Dragging:
        break;
      case WindowState.NativeMaximized:
        this.window.commit(undefined, undefined, undefined);
        break;

      case WindowState.NativeFullscreen:
        this.window.commit(undefined, undefined, WindowLayer.Normal);
        break;

      case WindowState.Floating:
        if (!this.shouldCommitFloat) break;
        this.window.commit(
          this.floatGeometry,
          false,
          undefined // Use default layer
        );
        this.shouldCommitFloat = false;
        break;

      case WindowState.Maximized:
        this.window.commit(this.geometry, true, WindowLayer.Normal);
        break;

      case WindowState.Tiled:
        this.window.commit(
          this.geometry,
          (noBorders) ? true : false, // Removed CONFIG.noTileBorder check
          undefined // Use default layer
        );
        break;

      case WindowState.TiledAfloat:
        if (!this.shouldCommitFloat) break;
        this.window.commit(
          this.floatGeometry,
          false,
          undefined
        );
        this.shouldCommitFloat = false;
        break;
    }
  }

  public forceSetGeometry(geometry: Rect) {
    this.window.commit(geometry);
  }

  public moveMouseToFocus() {
    this.window.moveMouseToFocus();
  }

  public visible(srf: ISurface): boolean {
    return this.window.visible(srf);
  }
}
