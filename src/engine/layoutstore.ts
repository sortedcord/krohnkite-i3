/*
    SPDX-FileCopyrightText: 2018 Eon S. Jeon <esjeon@hyunmu.am>
    SPDX-FileCopyrightText: 2024 Vjatcheslav V. Kolchkov <akl334@protonmail.ch>

    SPDX-License-Identifier: MIT
*/

class NullLayout implements ILayout {
  public readonly description = "Null";
  // Trivial implementation
  public apply(ctx: EngineContext, tileables: WindowClass[], area: Rect, gap: number): void { }
}

class LayoutStoreEntry {
  public readonly layout: ILayout;

  constructor() {
    this.layout = new BinaryTreeLayout();
  }
}

class LayoutStore {
  private store: { [key: string]: LayoutStoreEntry };

  constructor() {
    this.store = {};
  }

  public getCurrentLayout(srf: ISurface): ILayout {
    if (srf.ignore) return new NullLayout();
    return this.getEntry(srf).layout;
  }

  public cycleLayout(srf: ISurface, step: 1 | -1): ILayout | null {
    // No cycling supported
    return null;
  }

  public setLayout(srf: ISurface, layoutClassID: string): ILayout | null {
    // Layout changing not supported
    return null;
  }

  public setSplit(ctx: IDriverContext, srf: ISurface, splitStr: "vertical" | "horizontal"): void {
    const layout = this.getCurrentLayout(srf);
    if (layout instanceof BinaryTreeLayout) {
      if (layout.setNextSplit(splitStr)) {
        const str = splitStr.charAt(0).toUpperCase() + splitStr.slice(1);
        ctx.showNotification(`Split ${str}`);
      }
    }
  }

  private getEntry(srf: ISurface): LayoutStoreEntry {
    // Use surface ID (output + desktop + activity)
    if (!this.store[srf.id]) {
      this.store[srf.id] = new LayoutStoreEntry();
    }
    return this.store[srf.id];
  }
}
