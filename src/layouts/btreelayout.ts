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
  private splitTargetWindowID: string | null = null;

  constructor() {
  }

  public setNextSplit(split: "horizontal" | "vertical", splitTargetWindowID?: string): void {
    this.nextSplit = split;
    this.splitTargetWindowID = splitTargetWindowID || null;
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

    // Remove nodes for windows that no longer exist
    this.pruneTree(this.root, tileableIDs);

    // If root disappeared
    if (this.root && this.root.isLeaf && this.root.windowID && !tileableIDs.has(this.root.windowID)) {
      this.root = null;
    }

    // Collapse empty containers
    this.simplifyTree(this.root);
    if (this.root && !this.root.isLeaf && this.root.children.length === 0) {
      this.root = null;
    }

    // Add new windows
    tileables.forEach(tileable => {
      if (!this.findNode(this.root, tileable.id)) {
        this.insertWindow(ctx, tileable);
      }
    });
  }

  private pruneTree(node: TreeNode | null, currentIDs: Set<string>): void {
    if (!node) return;

    // Check children
    for (let i = node.children.length - 1; i >= 0; i--) {
      const child = node.children[i];
      if (child.isLeaf) {
        if (child.windowID && !currentIDs.has(child.windowID)) {
          node.children.splice(i, 1);
          child.parent = null;
        }
      } else {
        this.pruneTree(child, currentIDs);
        // If child container became empty, remove it? 
        // Handled in simplifyTree
      }
    }
  }

  private simplifyTree(node: TreeNode | null): void {
    if (!node || node.isLeaf) return;

    // Recursively simplify children
    [...node.children].forEach(c => this.simplifyTree(c));

    // Remove empty leaf children (that are not windows)
    for (let i = node.children.length - 1; i >= 0; i--) {
      const child = node.children[i];
      if (child.isLeaf && !child.windowID) {
        node.children.splice(i, 1);
        child.parent = null;
      }
    }

    // Collapse single-child containers
    if (node.children.length === 1) {
      const child = node.children[0];
      if (node.parent) {
        node.parent.replaceChild(node, child);
      } else {
        // If I am root, make my child the new root
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

  private insertWindow(ctx: EngineContext, tileable: WindowClass): void {
    const newNode = new TreeNode();
    newNode.windowID = tileable.id;

    if (!this.root) {
      this.root = newNode;
      return;
    }

    // Insert relative to focused window
    const currentWin = ctx.currentWindow;
    let targetNode: TreeNode | null = null;

    if (currentWin) {
      targetNode = this.findNode(this.root, currentWin.id);
    }

    if (!targetNode) {
      // Fallback: use root or first leaf
      let curr = this.root;
      while (!curr.isLeaf && curr.children.length > 0) {
        curr = curr.children[0];
      }
      targetNode = curr;
    }

    // Simplified i3-insertion:
    // If nextSplit is set, we need to create a new container around the targetNode with that split.
    // If nextSplit is NOT set, we just add as sibling to current container.

    if (this.nextSplit) {
      const splitTargetNode = this.splitTargetWindowID
        ? this.findNode(this.root, this.splitTargetWindowID)
        : null;
      if (splitTargetNode) {
        targetNode = splitTargetNode;
      }
      const parent = targetNode.parent;
      // User requested a split direction for the NEXT window.
      // Wrap targetNode in a new container of type nextSplit.
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

      this.nextSplit = null; // Reset after usage
      this.splitTargetWindowID = null;
      return;
    }

    const parent = targetNode.parent;
    if (parent) {
      // Add as sibling
      const index = parent.children.indexOf(targetNode);
      parent.addChild(newNode, index + 1);
    } else {
      // targetNode is root. Root is a window.
      // Create a new container to hold both.
      // Default split: based on config or horizontal
      const newContainer = new TreeNode();
      newContainer.splitType = CONFIG.defaultSplitOrientation === 'vertical' ? 'vertical' : 'horizontal';

      this.root = newContainer;
      targetNode.parent = null; // Detach from old context (none)

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
      // Calculate sizes
      // Assuming equal split for N children for simplicity in this minimal version,
      // ignoring custom splitRatio for N>2 or creating complex binary structures.

      const count = node.children.length;
      const totalGap = (count - 1) * gap;
      const availableSize = (isHorizontal ? area.width : area.height) - totalGap;
      const unitSize = Math.floor(availableSize / count);

      let currentPos = isHorizontal ? area.x : area.y;

      node.children.forEach((child, i) => {
        // Last child gets remaining space to avoid rounding gaps
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

  // Stub for clone to satisfy potentially external usage
  public clone(): ILayout {
    return new BinaryTreeLayout();
  }

  public toString(): string {
    return "BinaryTreeLayout()";
  }
}
