#!/bin/bash
cd /opt/msn-avisos
export SB_URL=$(secreto get MALAGA__SUPABASE_URL)
export SB_KEY=$(secreto get MALAGA__SUPABASE_PUBLISHABLE_KEY)
export ROBOT_TOKEN=$(secreto get MALAGA__ROBOT_NOTIF_TOKEN)
python3 resumen_envio.py "$@" 2>&1
