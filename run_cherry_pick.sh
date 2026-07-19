#!/bin/bash
while [ -s remaining_commits.txt ]; do
  commit=$(head -n 1 remaining_commits.txt)
  tail -n +2 remaining_commits.txt > tmp.txt && mv tmp.txt remaining_commits.txt
  echo "Cherry picking $commit"
  git cherry-pick $commit
  if [ $? -ne 0 ]; then
    echo "Conflict at $commit, stopping."
    # Prepend it back so we know where we stopped, though technically we are in the middle of it.
    echo "$commit" | cat - remaining_commits.txt > temp && mv temp remaining_commits.txt
    exit 1
  fi
done
