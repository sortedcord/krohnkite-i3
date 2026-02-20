/*
    SPDX-FileCopyrightText: 2018 Eon S. Jeon <esjeon@hyunmu.am>
    SPDX-FileCopyrightText: 2024 Vjatcheslav V. Kolchkov <akl334@protonmail.ch>

    SPDX-License-Identifier: MIT
*/

/**
 * TilingController translates events to actions, implementing high-level
 * window management logic.
 *
 * In short, this class is just a bunch of event handling methods.
 */

class TilingController {
  public engine: TilingEngine;
  private isDragging: boolean;

  public constructor(engine: TilingEngine) {
    this.engine = engine;
    this.isDragging = false;
  }

  public onSurfaceUpdate(ctx: IDriverContext): void {
    this.engine.arrange(ctx, "onSurfaceUpdate");
  }

  public onCurrentActivityChanged(ctx: IDriverContext): void {
    this.engine.arrange(ctx, "onCurrentActivityChanged");
  }

  public onCurrentSurfaceChanged(ctx: IDriverContext): void {
    this.engine.arrange(ctx, "onCurrentSurfaceChanged");
  }

  public onWindowAdded(ctx: IDriverContext, window: WindowClass): void {
    this.engine.manage(window);
    if (
      window.state !== WindowState.NativeMaximized &&
      window.state !== WindowState.NativeFullscreen
    )
      this.engine.arrange(ctx, "onWindowAdded");
  }

  public onWindowSkipPagerChanged(
    ctx: IDriverContext,
    window: WindowClass,
    skipPager: boolean,
  ) {
    if (skipPager) window.state = WindowState.Floating;
    else window.state = WindowState.Undecided;
    this.engine.arrange(ctx, "onWindowSkipPagerChanged");
  }

  public onWindowRemoved(ctx: IDriverContext, window: WindowClass): void {
    this.engine.unmanage(window);
    this.engine.arrange(ctx, "onWindowRemoved");
  }

  public onWindowMoveStart(window: WindowClass): void {
    /* do nothing */
  }

  public onWindowMove(window: WindowClass): void {
    /* do nothing */
  }

  public onWindowDragging(
    ctx: IDriverContext,
    window: WindowClass,
    windowRect: Rect,
  ): void {
    // Basic drag support deactivated for strict tree mode initially
    // Can be re-enabled if needed
  }

  public onWindowMoveOver(ctx: IDriverContext, window: WindowClass): void {
    // If a tiled window was moved, we generally should re-tile it at the new position
    // For now, let's keep it simple: if it's floating, it stays floating.
    // If it was tiled, we might want to float it if dragged out?

    /* ... float window by dragging */
    if (window.state === WindowState.Tiled) {
      const diff = window.actualGeometry.subtract(window.geometry);
      const distance = Math.sqrt(diff.x ** 2 + diff.y ** 2);
      if (distance > 30) {
        window.floatGeometry = window.actualGeometry;
        window.state = WindowState.Floating;
        this.engine.arrange(ctx, "onWindowMoveOver");
        return;
      }
    }

    /* ... or return to the previous position */
    window.commit();
  }

  public onWindowResizeStart(window: WindowClass): void {
    /* do nothing */
  }

  public onWindowResize(ctx: IDriverContext, window: WindowClass): void {
    if (window.state === WindowState.Tiled) {
      this.engine.adjustLayout(window);
      this.engine.arrange(ctx, "onWindowResize");
    }
  }

  public onWindowResizeOver(ctx: IDriverContext, window: WindowClass): void {
    if (window.state === WindowState.Tiled) {
      this.engine.adjustLayout(window);
      this.engine.arrange(ctx, "onWindowResizeOver");
    } else {
      this.engine.enforceSize(ctx, window);
    }
  }

  public onWindowMaximizeChanged(
    ctx: IDriverContext,
    window: WindowClass,
  ): void {
    this.engine.arrange(ctx, "onWindowMaximizeChanged");
  }

  public onWindowGeometryChanged(
    ctx: IDriverContext,
    window: WindowClass,
  ): void {
    this.engine.enforceSize(ctx, window);
  }

  public onWindowChanged(
    ctx: IDriverContext,
    window: WindowClass | null,
    comment?: string,
  ): void {
    if (window) {
      if (comment === "unminimized") ctx.currentWindow = window;
      // Sanity check for float geometry
      const workingArea = window.surface.workingArea;
      if (window.floatGeometry.width > workingArea.width) {
        window.floatGeometry.width = workingArea.width;
      }
      if (window.floatGeometry.height > workingArea.height) {
        window.floatGeometry.height = workingArea.height;
      }
      this.engine.arrange(ctx, "onWindowChanged");
    }
  }

  public onWindowFocused(ctx: IDriverContext, window: WindowClass) {
    window.timestamp = Date.now();
  }

  public onDesktopsChanged(ctx: IDriverContext, window: WindowClass) {
    window.state = WindowState.Undecided;
  }

  public onShortcut(ctx: IDriverContext, input: Shortcut, data?: any) {
    if (this.engine.handleLayoutShortcut(ctx, input, data)) {
      if (CONFIG.movePointerOnFocus) {
        ctx.currentWindow?.moveMouseToFocus();
      }
      this.engine.arrange(ctx, "handleLayoutShortcut");
      return;
    }

    switch (input) {
      case Shortcut.FocusNext:
        this.engine.focusOrder(ctx, 1);
        break;
      case Shortcut.FocusPrev:
        this.engine.focusOrder(ctx, -1);
        break;

      case Shortcut.FocusUp:
        this.engine.focusDir(ctx, "up");
        break;
      case Shortcut.FocusDown:
        this.engine.focusDir(ctx, "down");
        break;
      case Shortcut.FocusLeft:
        this.engine.focusDir(ctx, "left");
        break;
      case Shortcut.FocusRight:
        this.engine.focusDir(ctx, "right");
        break;

      case Shortcut.GrowWidth:
        if (ctx.currentWindow) this.engine.resizeWindow(ctx.currentWindow, "east", 1);
        break;
      case Shortcut.ShrinkWidth:
        if (ctx.currentWindow) this.engine.resizeWindow(ctx.currentWindow, "east", -1);
        break;
      case Shortcut.GrowHeight:
        if (ctx.currentWindow) this.engine.resizeWindow(ctx.currentWindow, "south", 1);
        break;
      case Shortcut.ShrinkHeight:
        if (ctx.currentWindow) this.engine.resizeWindow(ctx.currentWindow, "south", -1);
        break;

      case Shortcut.ShiftUp:
      case Shortcut.SwapUp:
        this.engine.swapDirOrMoveFloat(ctx, "up");
        break;
      case Shortcut.ShiftDown:
      case Shortcut.SwapDown:
        this.engine.swapDirOrMoveFloat(ctx, "down");
        break;
      case Shortcut.ShiftLeft:
      case Shortcut.SwapLeft:
        this.engine.swapDirOrMoveFloat(ctx, "left");
        break;
      case Shortcut.ShiftRight:
      case Shortcut.SwapRight:
        this.engine.swapDirOrMoveFloat(ctx, "right");
        break;

      case Shortcut.ToggleFloat:
        if (ctx.currentWindow) this.engine.toggleFloat(ctx.currentWindow);
        break;

      case Shortcut.SplitVertical:
        if (ctx.currentWindow) {
          this.engine.layouts.setSplit(ctx, ctx.currentSurface, "vertical");
        }
        break;
      case Shortcut.SplitHorizontal:
        if (ctx.currentWindow) {
          this.engine.layouts.setSplit(ctx, ctx.currentSurface, "horizontal");
        }
        break;

      // Shortcuts for SetMaster/FloatAll/Layout cycling removed.


      // Removed Meta, Dock, Cycle Layout shortcuts
    }

    // Always arrange if action taken? 
    // Most methods above trigger arrange or need it.
    // simpler to call arrange if unsure, though inefficient.
    // For now rely on specific calls inside engine or add generic arrange here?
    // Engine methods usually return boolean or void.
    // Let's add arrange call here for safety if we think state changed.
    this.engine.arrange(ctx, "onShortcut");
  }
}

