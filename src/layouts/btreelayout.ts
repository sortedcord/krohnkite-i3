/*
    SPDX-FileCopyrightText: 2024 Vjatcheslav V. Kolchkov <akl334@protonmail.ch>

    SPDX-License-Identifier: MIT
*/

class TreeNode {
  public parent: TreeNode | null = null;
  public children: TreeNode[] = [];
  public windowID: string | null = null;
  public splitType: "horizontal" | "vertical" = "horizontal";
  public splitRatio: number = 0.5;

  constructor() { }

  public get isLeaf(): boolean {
    return this.children.length === 0;
  }

  public addChild(node: TreeNode, index: number = -1): void {
    node.parent = this;
    if (index < 0 || index >= this.children.length) {
      this.children.push(node);
    } else {
      this.children.splice(index, 0, node);
    }
  }

  public removeChild(node: TreeNode): void {
    const index = this.children.indexOf(node);
    if (index >= 0) {
      this.children.splice(index, 1);
      node.parent = null;
    }
  }

  public replaceChild(oldNode: TreeNode, newNode: TreeNode): void {
    const index = this.children.indexOf(oldNode);
    if (index >= 0) {
      this.children[index] = newNode;
      newNode.parent = this;
      oldNode.parent = null;
    }
  }
}

class BinaryTreeLayout implements ILayout {
  public static readonly id = "BinaryTreeLayout";
  public readonly classID = BinaryTreeLayout.id;
  public readonly description = "Tree";
  public readonly capacity?: number | null;

  private root: TreeNode | null = null;
  private nextSplit: "horizontal" | "vertical" | null = null;
  private lastFocusID: string | null = null;

  constructor() {
  }

  public setNextSplit(split: "horizontal" | "vertical"): void {
    this.nextSplit = split;
  }

  public apply(
    ctx: EngineContext,
    tileables: WindowClass[],
    area: Rect,
    gap: number
  ): void {
    this.reconcile(ctx, tileables);

    if (this.root) {
      this.applyNode(this.root, area, gap, tileables);
    }
  }

  private reconcile(ctx: EngineContext, tileables: WindowClass[]): void {
    const tileableIDs = new Set(tileables.map(t => t.id));



    if (ctx.currentWindow && this.findNode(this.root, ctx.currentWindow.id)) {
      this.lastFocusID = ctx.currentWindow.id;
    }

    // remove nodes for windows that no longer exist
    this.pruneTree(this.root, tileableIDs);

    // if root disappeared
    if (this.root && this.root.isLeaf && this.root.windowID && !tileableIDs.has(this.root.windowID)) {
      this.root = null;
    }

    // collapse empty containers
    this.simplifyTree(this.root);
    if (this.root && !this.root.isLeaf && this.root.children.length === 0) {
      this.root = null;
    }

    // add new windows
    tileables.forEach(tileable => {
      if (!this.findNode(this.root, tileable.id)) {
        this.insertWindow(ctx, tileable, tileables);
      }
    });
  }

  private pruneTree(node: TreeNode | null, currentIDs: Set<string>): void {
    if (!node) return;

    // check children
    for (let i = node.children.length - 1; i >= 0; i--) {
      const child = node.children[i];
      if (child.isLeaf) {
        if (child.windowID && !currentIDs.has(child.windowID)) {
          node.children.splice(i, 1);
          child.parent = null;
        }
      } else {
        this.pruneTree(child, currentIDs);
        // if child container became empty, remove it?
        // handled in simplifyTree
      }
    }
  }

  private simplifyTree(node: TreeNode | null): void {
    if (!node || node.isLeaf) return;

    // recursively simplify children
    [...node.children].forEach(c => this.simplifyTree(c));

    // remove empty leaf children (that are not windows)
    for (let i = node.children.length - 1; i >= 0; i--) {
      const child = node.children[i];
      if (child.isLeaf && !child.windowID) {
        node.children.splice(i, 1);
        child.parent = null;
      }
    }

    // collapse single-child containers
    if (node.children.length === 1) {
      const child = node.children[0];
      if (node.parent) {
        node.parent.replaceChild(node, child);
      } else {
        // if i am root, make my child the new root
        this.root = child;
        child.parent = null;
      }
    }
  }

  private findNode(node: TreeNode | null, windowID: string): TreeNode | null {
    if (!node) return null;
    if (node.windowID === windowID) return node;
    for (const child of node.children) {
      const res = this.findNode(child, windowID);
      if (res) return res;
    }
    return null;
  }

  private insertWindow(ctx: EngineContext, tileable: WindowClass, contextTileables: WindowClass[]): void {
    const newNode = new TreeNode();
    newNode.windowID = tileable.id;

    if (!this.root) {
      this.root = newNode;
      return;
    }

    // insert relative to focused window
    const currentWin = ctx.currentWindow;
    let targetNode: TreeNode | null = null;

    // check tree for max timestamp to find insertion point
    if (!targetNode && this.root) {
      let maxTime = -1;

      const stack: TreeNode[] = [this.root];
      while (stack.length > 0) {
        const node = stack.pop();
        if (!node) continue;

        if (node.isLeaf && node.windowID) {
          const win = contextTileables.find(w => w.id === node.windowID);
          if (win && win.timestamp > maxTime) {
            maxTime = win.timestamp;
            targetNode = node;
          }
        } else {
          node.children.forEach(c => stack.push(c));
        }
      }
    }

    if (!targetNode) {
      // fallback: use root or first leaf
      let curr = this.root;
      while (!curr.isLeaf && curr.children.length > 0) {
        curr = curr.children[0];
      }
      targetNode = curr;
    }

    // simplified i3-insertion:
    // if nextSplit is set, we need to create a new container around the targetNode with that split
    // if nextSplit is NOT set, we just add as sibling to current container

    const parent = targetNode.parent;

    if (this.nextSplit) {
      // user requested a split direction for the NEXT window
      // wrap targetNode in a new container of type nextSplit
      const newContainer = new TreeNode();
      newContainer.splitType = this.nextSplit;

      if (parent) {
        parent.replaceChild(targetNode, newContainer);
      } else {
        this.root = newContainer;
      }

      targetNode.parent = null;
      newContainer.addChild(targetNode);
      newContainer.addChild(newNode);

      this.nextSplit = null; // reset after usage
      return;
    }

    if (parent) {
      // add as sibling
      const index = parent.children.indexOf(targetNode);
      parent.addChild(newNode, index + 1);
    } else {
      // targetNode is root
      // create a new container to hold both
      // default split: based on config or horizontal
      const newContainer = new TreeNode();
      newContainer.splitType = CONFIG.defaultSplitOrientation === 'vertical' ? 'vertical' : 'horizontal';

      this.root = newContainer;
      targetNode.parent = null; // detach from old context

      newContainer.addChild(targetNode);
      newContainer.addChild(newNode);
    }
  }

  private applyNode(node: TreeNode, area: Rect, gap: number, tileables: WindowClass[]): void {
    if (node.isLeaf) {
      if (node.windowID) {
        const win = tileables.find(w => w.id === node.windowID);
        if (win) {
          win.state = WindowState.Tiled;
          win.geometry = area;
        }
      }
      return;
    }

    if (node.children.length > 0) {
      const isHorizontal = node.splitType === 'horizontal';
      // calculate sizes
      // assuming equal split for n children for simplicity in this minimal version,
      // ignoring custom splitRatio for n>2 or creating complex binary structures

      const count = node.children.length;
      const totalGap = (count - 1) * gap;
      const availableSize = (isHorizontal ? area.width : area.height) - totalGap;
      const unitSize = Math.floor(availableSize / count);

      let currentPos = isHorizontal ? area.x : area.y;

      node.children.forEach((child, i) => {
        // last child gets remaining space to avoid rounding gaps
        const mySize = (i === count - 1)
          ? ((isHorizontal ? area.width : area.height) - (currentPos - (isHorizontal ? area.x : area.y)))
          : unitSize;

        const myRect = new Rect(
          isHorizontal ? currentPos : area.x,
          isHorizontal ? area.y : currentPos,
          isHorizontal ? mySize : area.width,
          isHorizontal ? area.height : mySize
        );

        this.applyNode(child, myRect, gap, tileables);

        currentPos += mySize + gap;
      });
    }
  }

  // stub for clone to satisfy potentially external usage
  public clone(): ILayout {
    return new BinaryTreeLayout();
  }

  public toString(): string {
    return "BinaryTreeLayout()";
  }
}
