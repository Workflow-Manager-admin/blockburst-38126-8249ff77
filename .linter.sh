#!/bin/bash
cd /home/kavia/workspace/code-generation/blockburst-38126-8249ff77/blockburst_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

