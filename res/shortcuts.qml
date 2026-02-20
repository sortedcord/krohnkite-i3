/*
    SPDX-FileCopyrightText: 2018 Eon S. Jeon <esjeon@hyunmu.am>
    SPDX-FileCopyrightText: 2024 Vjatcheslav V. Kolchkov <akl334@protonmail.ch>

    SPDX-License-Identifier: MIT
*/


import QtQuick;
import org.kde.kwin;

Item {
    id: shortcuts;

    function getFocusNext() {
        return focusNext;
    }
    ShortcutHandler {
        id: focusNext;

        name: "KrohnkiteFocusNext";
        text: "Krohnkite: Focus Next";
        sequence: "Meta+.";
    }

    function getFocusPrev() {
        return focusPrev;
    }
    ShortcutHandler {
        id: focusPrev;

        name: "KrohnkiteFocusPrev";
        text: "Krohnkite: Focus Previous";
        sequence: "Meta+,";
    }

    function getFocusLeft() {
        return focusLeft;
    }
    ShortcutHandler {
        id: focusLeft;

        name: "KrohnkiteFocusLeft";
        text: "Krohnkite: Focus Left";
        sequence: "Meta+H";
    }

    function getFocusRight() {
        return focusRight;
    }
    ShortcutHandler {
        id: focusRight;

        name: "KrohnkiteFocusRight";
        text: "Krohnkite: Focus Right";
        sequence: "Meta+L";
    }

    function getToggleDock() {
        return toggleDock;
    }
    ShortcutHandler {
        id: toggleDock;

        name: "KrohnkitetoggleDock";
        text: "Krohnkite: Toggle Dock";
        sequence: "";
    }


    function getFocusDown() {
        return focusDown;
    }
    ShortcutHandler {
        id: focusDown;

        name: "KrohnkiteFocusDown";
        text: "Krohnkite: Focus Down";
        sequence: "Meta+J";
    }
    function getFocusUp() {
        return focusUp;
    }
    ShortcutHandler {
        id: focusUp;

        name: "KrohnkiteFocusUp";
        text: "Krohnkite: Focus Up";
        sequence: "Meta+K";
    }
    function getShiftDown() {
        return shiftDown;
    }
    ShortcutHandler {
        id: shiftDown;

        name: "KrohnkiteShiftDown";
        text: "Krohnkite: Move Down/Next";
        sequence: "Meta+Shift+J";
    }
    function getShiftUp() {
        return shiftUp;
    }
    ShortcutHandler {
        id: shiftUp;

        name: "KrohnkiteShiftUp";
        text: "Krohnkite: Move Up/Prev";
        sequence: "Meta+Shift+K";
    }
    function getShiftLeft() {
        return shiftLeft;
    }
    ShortcutHandler {
        id: shiftLeft;

        name: "KrohnkiteShiftLeft";
        text: "Krohnkite: Move Left";
        sequence: "Meta+Shift+H";
    }
    function getShiftRight() {
        return shiftRight;
    }
    ShortcutHandler {
        id: shiftRight;

        name: "KrohnkiteShiftRight";
        text: "Krohnkite: Move Right";
        sequence: "Meta+Shift+L";
    }
    function getGrowHeight() {
        return growHeight;
    }
    ShortcutHandler {
        id: growHeight;

        name: "KrohnkiteGrowHeight";
        text: "Krohnkite: Grow Height";
        sequence: "Meta+Ctrl+J";
    }
    function getShrinkHeight() {
        return shrinkHeight;
    }
    ShortcutHandler {
        id: shrinkHeight;

        name: "KrohnkiteShrinkHeight";
        text: "Krohnkite: Shrink Height";
        sequence: "Meta+Ctrl+K";
    }
    function getShrinkWidth() {
        return shrinkWidth;
    }
    ShortcutHandler {
        id: shrinkWidth;

        name: "KrohnkiteShrinkWidth";
        text: "Krohnkite: Shrink Width";
        sequence: "Meta+Ctrl+H";
    }
    function getGrowWidth() {
        return growWidth;
    }
    ShortcutHandler {
        id: growWidth;

        name: "KrohnkitegrowWidth";
        text: "Krohnkite: Grow Width";
        sequence: "Meta+Ctrl+L";
    }
    function getIncrease() {
        return increase;
    }
    ShortcutHandler {
        id: increase;

        name: "KrohnkiteIncrease";
        text: "Krohnkite: Increase";
        sequence: "Meta+I";
    }
    function getDecrease() {
        return decrease;
    }
    ShortcutHandler {
        id: decrease;

        name: "KrohnkiteDecrease";
        text: "Krohnkite: Decrease";
        sequence: "Meta+D";
    }
    function getToggleFloat() {
        return toggleFloat;
    }
    ShortcutHandler {
        id: toggleFloat;

        name: "KrohnkiteToggleFloat";
        text: "Krohnkite: Toggle Float";
        sequence: "Meta+F";
    }

    function getSplitVertical() {
        return splitVertical;
    }
    ShortcutHandler {
        id: splitVertical;

        name: "KrohnkiteSplitVertical";
        text: "Krohnkite: Split Vertical";
        sequence: "Meta+V";
    }

    function getSplitHorizontal() {
        return splitHorizontal;
    }
    ShortcutHandler {
        id: splitHorizontal;

        name: "KrohnkiteSplitHorizontal";
        text: "Krohnkite: Split Horizontal";
        sequence: "Meta+G"; // H is used for move left. Using G for now? Or H? Meta+G is common alternatives. Or Meta+H if move is separate.
        // Wait, standard Vim move is HJKL.
        // Usually i3 uses Mod+H (horizontal) and Mod+V (vertical).
        // But Mod+H is Left.
        // i3 default config uses:
        // Mod+h focus left
        // Mod+v split vertical
        // Mod+Shift+v split horizontal (Wait no)
        // default: Mod+h (split h) Mod+v (split v). But then what is move left?
        // i3 default uses arrows or jkl;
        // Mod+j left, k down, l up, ; right.
        // Ah. Vim binding users often remap split to other keys.
        // Let's use Meta+V for vertical. 
        // Meta+B for Horizontal? G is good.
    }
}
