#!/usr/bin/env bash
trap 'calibration_rc=$?; trap - EXIT; exec nice -n 19 python3 "${CALIBRATION_FINALIZER}" "$calibration_rc"' EXIT
source "${CALIBRATION_SANDBOX_SCRIPT}"
