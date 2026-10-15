/* PEDAL POINT: THE RECORDED TIMPANI. Every sample file in shared/sounds/timpani/ and its measured pitch.
   [file, hz, layer, seconds]:
     file     shared/sounds/timpani/<file>.m4a (the hit is HIT_MS into the file)
     hz       the PITCH WE HEAR, measured (the principal, checked against its 1.5× and 2× overtones). Fix one by ear with
              the SAMPLE TUNER (pedal-point/index.html?tune-samples): it gives you new lines to paste here.
     layer    soft | mid | loud (how hard the drum was struck)
     seconds  the file's length (how long it rings)
   Source: the Versilian Community Sample Library (VCSL) by Versilian Studios, CC0 1.0 (public domain);
   https://github.com/sgossner/VCSL , Membranophones/Struck Membranophones/Timpani 2/Hit/. The comment after each
   line is the VCSL take it came from. TO USE YOUR OWN RECORDINGS: see shared/sounds/timpani/README.md. */
window.PP_SAMPLES = {
  dir: 'timpani/',   // under shared/sounds/
  HIT_MS: 10,
  list: [
    ['timp-d2-soft-1', 74.58, 'soft', 7.00],   // Timpani7G_hit_v2_rr1
    ['timp-d2-mid-1', 76.20, 'mid', 6.15],   // Timpani7G_hit_v3_rr1
    ['timp-d2-loud-1', 75.23, 'loud', 4.75],   // Timpani7G_hit_v5_rr2
    ['timp-f2-soft-1', 89.01, 'soft', 7.00],   // Timpani7E_hit_v2_rr1
    ['timp-f2-soft-2', 89.08, 'soft', 7.00],   // Timpani7E_hit_v2_rr2
    ['timp-f2-mid-1', 89.01, 'mid', 6.30],   // Timpani7E_hit_v3_rr1
    ['timp-f2-mid-2', 88.50, 'mid', 6.05],   // Timpani7E_hit_v3_rr2
    ['timp-f2-loud-1', 88.49, 'loud', 4.15],   // Timpani7E_hit_v5_rr1
    ['timp-f2-loud-2', 88.37, 'loud', 5.05],   // Timpani7E_hit_v5_rr2
    ['timp-g2-soft-1', 97.10, 'soft', 4.55],   // Timpani7F_hit_v2_rr1
    ['timp-g2-soft-2', 97.47, 'soft', 4.85],   // Timpani7F_hit_v2_rr2
    ['timp-g2-mid-1', 98.57, 'mid', 6.05],   // Timpani7F_hit_v3_rr1
    ['timp-g2-mid-2', 98.60, 'mid', 5.05],   // Timpani7F_hit_v3_rr2
    ['timp-g2-loud-1', 97.64, 'loud', 4.70],   // Timpani7F_hit_v5_rr1
    ['timp-g2-loud-2', 97.47, 'loud', 3.90],   // Timpani7F_hit_v5_rr2
    ['timp-ab2-soft-1', 102.93, 'soft', 3.05],   // Timpani6J_hit_v2_rr1
    ['timp-ab2-soft-2', 102.55, 'soft', 3.70],   // Timpani6J_hit_v2_rr2
    ['timp-ab2-mid-1', 104.75, 'mid', 2.80],   // Timpani6J_hit_v3_rr1
    ['timp-ab2-mid-2', 104.99, 'mid', 2.60],   // Timpani6J_hit_v3_rr2
    ['timp-ab2-loud-1', 104.81, 'loud', 3.00],   // Timpani6J_hit_v5_rr1
    ['timp-ab2-loud-2', 105.18, 'loud', 2.35],   // Timpani6J_hit_v5_rr2
    ['timp-a2-soft-1', 109.87, 'soft', 4.30],   // Timpani6I_hit_v2_rr1
    ['timp-a2-soft-2', 109.88, 'soft', 3.45],   // Timpani6I_hit_v2_rr2
    ['timp-a2-mid-1', 110.37, 'mid', 3.60],   // Timpani6I_hit_v3_rr1
    ['timp-a2-mid-2', 111.16, 'mid', 3.70],   // Timpani6I_hit_v3_rr2
    ['timp-a2-loud-1', 112.85, 'loud', 2.70],   // Timpani6I_hit_v5_rr1
    ['timp-a2-loud-2', 112.47, 'loud', 2.80],   // Timpani6I_hit_v5_rr2
    ['timp-b2-soft-1', 123.66, 'soft', 3.60],   // Timpani6G_hit_v2_rr1
    ['timp-b2-soft-2', 123.21, 'soft', 3.70],   // Timpani6G_hit_v2_rr2
    ['timp-b2-mid-1', 122.85, 'mid', 3.70],   // Timpani6G_hit_v3_rr1
    ['timp-b2-mid-2', 123.15, 'mid', 3.65],   // Timpani6G_hit_v3_rr2
    ['timp-b2-loud-1', 125.82, 'loud', 2.60],   // Timpani6G_hit_v5_rr1
    ['timp-b2-loud-2', 123.66, 'loud', 2.55],   // Timpani6G_hit_v5_rr2
    ['timp-c3-soft-1', 132.40, 'soft', 3.10],   // Timpani6F_hit_v2_rr1
    ['timp-c3-soft-2', 131.49, 'soft', 3.70],   // Timpani6F_hit_v2_rr2
    ['timp-c3-mid-1', 132.51, 'mid', 3.65],   // Timpani6F_hit_v3_rr1
    ['timp-c3-mid-2', 133.05, 'mid', 3.55],   // Timpani6F_hit_v3_rr2
    ['timp-c3-loud-1', 134.83, 'loud', 2.90],   // Timpani6F_hit_v5_rr1
    ['timp-c3-loud-2', 133.90, 'loud', 2.60],   // Timpani6F_hit_v5_rr2
    ['timp-db3-soft-1', 139.15, 'soft', 2.45],   // Timpani6E_hit_v2_rr1
    ['timp-db3-soft-2', 138.29, 'soft', 2.50],   // Timpani6E_hit_v2_rr2
    ['timp-db3-mid-1', 138.36, 'mid', 2.05],   // Timpani6E_hit_v3_rr1
    ['timp-db3-loud-1', 138.17, 'loud', 3.05],   // Timpani6E_hit_v5_rr1
    ['timp-db3-loud-2', 139.11, 'loud', 2.75],   // Timpani6E_hit_v5_rr2
    ['timp-d3-soft-1', 147.21, 'soft', 2.90],   // Timpani6D_hit_v2_rr1
    ['timp-d3-soft-2', 147.60, 'soft', 3.00],   // Timpani6D_hit_v2_rr2
    ['timp-d3-mid-1', 147.33, 'mid', 2.75],   // Timpani6D_hit_v3_rr1
    ['timp-d3-mid-2', 147.34, 'mid', 2.70],   // Timpani6D_hit_v3_rr2
    ['timp-d3-loud-1', 148.46, 'loud', 2.60],   // Timpani6D_hit_v5_rr1
    ['timp-d3-loud-2', 149.06, 'loud', 3.10],   // Timpani6D_hit_v5_rr2
    ['timp-eb3-soft-1', 158.38, 'soft', 3.05],   // Timpani6C_hit_v2_rr1
    ['timp-eb3-soft-2', 157.23, 'soft', 2.75],   // Timpani6C_hit_v2_rr2
    ['timp-eb3-mid-1', 158.55, 'mid', 2.55],   // Timpani6C_hit_v3_rr1
    ['timp-eb3-mid-2', 154.96, 'mid', 3.00],   // Timpani6C_hit_v3_rr2
    ['timp-eb3-loud-1', 158.41, 'loud', 2.15],   // Timpani6C_hit_v5_rr2
    ['timp-e3-soft-1', 163.73, 'soft', 2.85],   // Timpani6B_hit_v2_rr1
    ['timp-e3-soft-2', 163.85, 'soft', 2.55],   // Timpani6B_hit_v2_rr2
    ['timp-e3-mid-1', 164.20, 'mid', 3.25],   // Timpani6B_hit_v3_rr1
    ['timp-e3-mid-2', 164.48, 'mid', 2.75],   // Timpani6B_hit_v3_rr2
    ['timp-e3-loud-1', 167.01, 'loud', 1.95],   // Timpani6B_hit_v5_rr1
    ['timp-fs3-soft-1', 184.31, 'soft', 6.15],   // Timpani7C_hit_v2_rr1
    ['timp-fs3-soft-2', 184.31, 'soft', 5.15],   // Timpani7C_hit_v2_rr2
    ['timp-fs3-mid-1', 188.13, 'mid', 5.90],   // Timpani7C_hit_v3_rr1
    ['timp-fs3-loud-1', 187.42, 'loud', 3.95],   // Timpani7C_hit_v5_rr1
    ['timp-fs3-loud-2', 187.97, 'loud', 4.75],   // Timpani7C_hit_v5_rr2
  ],
};
