# CMAPIVA Tool

An Electron-based desktop application for visualizing and managing Veeva-like interactive visual aids (IVAs) through an intuitive tile-based layout. Designed to streamline the content mapping, editing, and export workflow for slide decks and modular content commonly used in pharmaceutical marketing and sales.

## Features

- Drag-and-drop import of a `/screens` folder to auto-generate a structured tile layout
- Editable preview pane with brand name and slide labels
- Hover-based tile expansion and thumbnail strip for tab slides
- Indicator circles for mods, refs, and tabs that can be docked or moved
- In-app image editor with draggable, resizable rectangles to visually map button targets
- Full project stored in a centralized `projectData` JSON structure
- Export-ready architecture for generating per-tile `.js` and `.css` files (WIP)

## Installation

Clone this repo, then run:

```bash
npm install
npm start