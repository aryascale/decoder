#!/bin/bash
export GIT_SEQUENCE_EDITOR="sed -i '' -e 's/^pick 47720f9/reword 47720f9/' -e 's/^pick e4e74fb/reword e4e74fb/'"
export GIT_EDITOR="sed -i '' -e 's/fix: store only HH:MM:SS for manual start\\/finish clickTimestamp (remove date portion)/fix/' -e 's/fix: re-add milliseconds to client-side generated timestamps and time inputs/fix/'"
git rebase -i HEAD~3
