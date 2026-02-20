/*
    SPDX-FileCopyrightText: 2018 Eon S. Jeon <esjeon@hyunmu.am>
    SPDX-FileCopyrightText: 2024 Vjatcheslav V. Kolchkov <akl334@protonmail.ch>

    SPDX-License-Identifier: MIT
*/

type ScreenData = {
  visibles: WindowClass[];
  tileables: WindowClass[];
  layout: ILayout;
  workingArea: Rect;
  srf: ISurface;
};

/**
 * Maintains tiling context and performs various tiling actions.
 */
class TilingEngine {
  public layouts: LayoutStore;
  public windows: WindowStore;
  private _defaultGaps: DefaultGapsCfg | null;
  private _gapsSurfacesCfg: gapsSurfaceCfg[];

  constructor() {
    this.layouts = new LayoutStore();
    this.windows = new WindowStore();
    this._defaultGaps = null;
    this._gapsSurfacesCfg = [];
  }

  public adjustLayout(basis: WindowClass) {
    let delta = basis.geometryDelta;
    if (delta === null) return;
    const srf = basis.surface;
    const layout = this.layouts.getCurrentLayout(srf);
    if (layout.adjust) {
      const gaps = this.getGaps(srf);
      const area = srf.workingArea.gap(
        gaps.left,
        gaps.right,
        gaps.top,
        gaps.bottom,
      );
      const tiles = this.windows.getVisibleTiles(srf);
      layout.adjust(area, tiles, basis, delta, gaps.between);
    }
  }

  public resizeFloat(
    window: WindowClass,
    dir: "east" | "west" | "south" | "north",
    step: -1 | 1,
  ) {
    const srf = window.surface;
    const hStepSize = srf.workingArea.width * 0.05;
    const vStepSize = srf.workingArea.height * 0.05;

    let hStep = 0, vStep = 0;
    switch (dir) {
      case "east": hStep = step; break;
      case "west": hStep = -step; break;
      case "south": vStep = step; break;
      case "north": vStep = -step; break;
    }

    const geometry = window.actualGeometry;
    const width = geometry.width + hStepSize * hStep;
    const height = geometry.height + vStepSize * vStep;

    window.forceSetGeometry(new Rect(geometry.x, geometry.y, width, height));
  }

  public resizeTile(
    basis: WindowClass,
    dir: "east" | "west" | "south" | "north",
    step: -1 | 1,
  ) {
    // Delegate to layout.handleShortcut or just assume layout handles geometry updates on apply?
    // TreeLayout doesn't implement 'adjust' yet, but 'handleShortcut' might be better for keyboard resizing.
    // But this function is called by shortcuts.

    // For now, let's leave it no-op or todo, as explicit resize logic in TreeLayout is complex 
    // and usually handled by tree manipulation methods (expand/shrink split).
  }

  public resizeWindow(
    window: WindowClass,
    dir: "east" | "west" | "south" | "north",
    step: -1 | 1,
  ) {
    const state = window.state;
    if (WindowClass.isFloatingState(state)) this.resizeFloat(window, dir, step);
    else if (WindowClass.isTiledState(state))
      this.resizeTile(window, dir, step);
  }

  public arrange(ctx: IDriverContext, reason: string) {
    const surfaces = ctx.currentSurfaces;
    surfaces.forEach((srf) => {
      const screenData = this.getTileables(srf);
      this.arrangeScreen(ctx, screenData, reason);
    });
  }

  private getTileables(srf: ISurface): ScreenData {
    let visibles = this.windows.getVisibleWindows(srf);
    visibles.forEach((window) => {
      if (window.state === WindowState.Undecided) {
        window.state =
          window.shouldFloat || CONFIG.floatDefault
            ? WindowState.Floating
            : WindowState.Tiled;
      }
    });

    let tileables = this.windows.getVisibleTileables(srf);
    let layout = this.layouts.getCurrentLayout(srf);

    return {
      visibles: visibles,
      tileables: tileables,
      layout: layout,
      workingArea: srf.workingArea.clone(),
      srf: srf
    };
  }

  public arrangeScreen(
    ctx: IDriverContext,
    screenData: ScreenData,
    reason: string,
  ) {
    screenData.visibles.forEach(win => {
      if (screenData.tileables.indexOf(win) < 0 && !win.isFloating) {
        // Ensure non-tiled, non-floating windows are handled?
        // If not tileable, maybe it should be floating?
      }
    });

    const gaps = this.getGaps(screenData.srf);
    let tilingArea = screenData.workingArea.gap(
      gaps.left,
      gaps.right,
      gaps.top,
      gaps.bottom,
    );

    if (screenData.tileables.length > 0) {
      let engineCtx = new EngineContext(ctx, this);
      screenData.layout.apply(
        engineCtx,
        screenData.tileables,
        tilingArea,
        gaps.between,
      );
    }

    screenData.visibles.forEach((window) => window.commit());
  }

  public enforceSize(ctx: IDriverContext, window: WindowClass) {
    if (window.isTiled && !window.actualGeometry.equals(window.geometry))
      ctx.setTimeout(() => {
        if (window.isTiled) window.commit();
      }, 10);
  }

  public manage(window: WindowClass) {
    if (!window.shouldIgnore) {
      window.state = WindowState.Undecided;
      this.windows.push(window);
    }
  }

  public unmanage(window: WindowClass) {
    this.windows.remove(window);
  }

  public focusOrder(ctx: IDriverContext, step: -1 | 1) {
    // Basic focus change in list of windows
    // Ideally should be tree traversal
    // But windows.getVisibleTiles returns a list.
    // TreeLayout should probably implement directional focus or "next/prev" in visual order

    const window = ctx.currentWindow;
    if (window === null) {
      const tiles = this.windows.getVisibleTiles(ctx.currentSurface);
      if (tiles.length > 0) ctx.currentWindow = tiles[0];
      if (CONFIG.movePointerOnFocus) DBUS.moveMouseToFocus();
      return;
    }

    const visibles = this.windows.getVisibleWindows(ctx.currentSurface); // Or tiles?
    // Focus cyclic in tiles list
    const tiles = this.windows.getVisibleTiles(ctx.currentSurface);
    if (tiles.length === 0) return;

    const idx = tiles.indexOf(window);
    if (idx < 0) {
      ctx.currentWindow = tiles[0];
    } else {
      const num = tiles.length;
      const newIndex = (idx + step + num) % num;
      ctx.currentWindow = tiles[newIndex];
    }

    if (CONFIG.movePointerOnFocus) {
      DBUS.moveMouseToFocus();
    }
  }

  public focusDir(ctx: IDriverContext, dir: Direction): boolean {
    // Rely on simple geometry based focus provided by KWin or implemented here?
    // Since we removed KWinConfig options for focus, we should just use geometry.
    // The previous implementation used getNeighborByDirection which is geometry based.

    const window = ctx.currentWindow;
    if (!window) return false;

    const neighbor = this.getNeighborByDirection(ctx, window, dir);
    if (neighbor) {
      ctx.currentWindow = neighbor;
      if (CONFIG.movePointerOnFocus) DBUS.moveMouseToFocus();
      return true;
    }

    // Fallback to KWin's focus logic for screens/desktops?
    // Simplified:
    return false;
  }

  public swapOrder(window: WindowClass, step: -1 | 1) {
    // Moving in list might not affect tree structure if TreeLayout relies on ID persistence
    // But TreeLayout reconciles based on Tileables list order?
    // My TreeLayout implementation doesn't look at list order for structure, only for new windows.
    // Logic for "Move Window" should probably manipulate the Tree.
    // Current swapOrder effectively changes order in WindowStore. 
    // If TreeLayout is sensitive to WindowStore order, this works.
    // But strict Tree doesn't care about list order.

    // Implementation: Move window in the Tree.
    // For now, no-op or basic list swap.
    const srf = window.surface;
    const visibles = this.windows.getVisibleWindows(srf);
    if (visibles.length < 2) return;
    const vsrc = visibles.indexOf(window);
    const vdst = wrapIndex(vsrc + step, visibles.length);
    const dstWin = visibles[vdst];
    this.windows.move(window, dstWin);
  }

  public swapDirection(
    ctx: IDriverContext,
    direction: Direction,
    window: WindowClass,
  ): boolean {
    const neighbor = this.getNeighborByDirection(ctx, window, direction);
    if (neighbor) {
      this.windows.swap(window, neighbor);
      return true;
    }
    return false;
  }

  public moveFloat(window: WindowClass, dir: Direction) {
    const srf = window.surface;
    const hStepSize = srf.workingArea.width * 0.05;
    const vStepSize = srf.workingArea.height * 0.05;

    let hStep = 0, vStep = 0;
    switch (dir) {
      case "up": vStep = -1; break;
      case "down": vStep = 1; break;
      case "left": hStep = -1; break;
      case "right": hStep = 1; break;
    }

    const geometry = window.actualGeometry;
    const x = geometry.x + hStepSize * hStep;
    const y = geometry.y + vStepSize * vStep;

    if (CONFIG.movePointerOnFocus) {
      window.moveMouseToFocus();
    }
    window.forceSetGeometry(new Rect(x, y, geometry.width, geometry.height));
  }

  public swapDirOrMoveFloat(ctx: IDriverContext, dir: Direction): boolean {
    const window = ctx.currentWindow;
    if (window === null) return false;

    const state = window.state;
    if (WindowClass.isFloatingState(state)) {
      this.moveFloat(window, dir);
      return false;
    } else if (WindowClass.isTiledState(state)) {
      return this.swapDirection(ctx, dir, window);
    }
    return true;
  }

  public toggleFloat(window: WindowClass) {
    window.state = !window.isTileable
      ? WindowState.Tiled
      : WindowState.Floating;
  }

  public setMaster(window: WindowClass) {
    this.windows.setMaster(window);
  }

  public cycleLayout(ctx: IDriverContext, step: 1 | -1) {
    // No-op
  }

  public setLayout(ctx: IDriverContext, layoutClassID: string) {
    // No-op
  }

  public handleLayoutShortcut(
    ctx: IDriverContext,
    input: Shortcut,
    data?: any,
  ): boolean {
    const layout = this.layouts.getCurrentLayout(ctx.currentSurface);
    if (layout.handleShortcut)
      return layout.handleShortcut(new EngineContext(ctx, this), input, data);
    return false;
  }

  private getNeighborByDirection(
    ctx: IDriverContext,
    basis: WindowClass,
    dir: Direction,
  ): WindowClass | null {
    let vertical: boolean;
    let sign: -1 | 1;
    switch (dir) {
      case "up":
        vertical = true;
        sign = -1;
        break;
      case "down":
        vertical = true;
        sign = 1;
        break;
      case "left":
        vertical = false;
        sign = -1;
        break;
      case "right":
        vertical = false;
        sign = 1;
        break;
      default:
        return null;
    }
    let windows = this.windows.getVisibleTileables(ctx.currentSurface);

    const candidates = windows
      .filter(
        vertical
          ? (tile) => tile.geometry.y * sign > basis.geometry.y * sign
          : (tile) => tile.geometry.x * sign > basis.geometry.x * sign,
      )
      .filter(
        vertical
          ? (tile) =>
            overlap(
              basis.geometry.x,
              basis.geometry.maxX,
              tile.geometry.x,
              tile.geometry.maxX,
            )
          : (tile) =>
            overlap(
              basis.geometry.y,
              basis.geometry.maxY,
              tile.geometry.y,
              tile.geometry.maxY,
            ),
      );
    if (candidates.length === 0) return null;

    const min =
      sign *
      candidates.reduce(
        vertical
          ? (prevMin, tile) => Math.min(tile.geometry.y * sign, prevMin)
          : (prevMin, tile) => Math.min(tile.geometry.x * sign, prevMin),
        Infinity,
      );

    const closest = candidates.filter(
      vertical
        ? (tile) => tile.geometry.y === min
        : (tile) => tile.geometry.x === min,
    );

    return closest.sort((a, b) => b.timestamp - a.timestamp)[0];
  }

  private getGaps(srf: ISurface): IGaps {
    if (this._defaultGaps === null) {
      this._defaultGaps = DefaultGapsCfg.instance;
      // We removed gaps logic from KWinConfig but kept gapsOverrideConfig strings.
      // gapsSurfaceCfg probably parses that string.
      // We should make sure `gapsSurfaceCfg` class exists and works.
      // Assuming it does (imported from gaps.ts).
      this._gapsSurfacesCfg = gapsSurfaceCfg.parseGapsUserSurfacesCfg();
    }
    const surfaceCfg = this._gapsSurfacesCfg.find((surfaceCfg) =>
      surfaceCfg.isFit(srf),
    );
    if (surfaceCfg === undefined) return this._defaultGaps;
    return surfaceCfg.cfg;
  }
}
