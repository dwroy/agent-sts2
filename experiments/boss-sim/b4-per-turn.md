# B4 per-turn: the simulated fights against the logged ones (tools/boss-sim/per-turn.py)

Turn-1 start, the validation fights (val_ext). Per fight turn: the fights the log still fought, the mean of the enemies' attack shown, the HP the enemy turn took through block, HP lost, the enemies' HP at the start of the turn (sim: at the end of the turn before; the B4 backtest records it, the 'before' run did not), the sim's samples still fighting. Before = experiments/boss-sim/raw/b4-base (B2/B3 code), after = b4-final.

## CRUSHER — b4-base

```
14 fights, start t1, set val_ext, enc CRUSHER
turn  n | incoming log/sim | through block log/sim | HP lost log/sim | enemy HP log/sim | sim fighting
   1  14 |   22.1   21.7 |    6.4    9.8 |    4.3    8.1 |  428.0   None | 1.00
   2  14 |   30.2   40.4 |   12.7   24.4 |   12.9   25.2 |  378.8   None | 1.00
   3  14 |   18.1   25.4 |    4.7    9.8 |    5.0   10.6 |  338.1   None | 1.00
   4  14 |   44.9   66.9 |   22.5   41.4 |   22.4   40.5 |  295.5   None | 0.90
   5   9 |   21.8   27.4 |    7.1   13.4 |    6.4   14.4 |  246.3   None | 0.50
   6   6 |   23.2   22.6 |    9.6   15.6 |    9.2   14.2 |  208.0   None | 0.30
   7   4 |   33.0   31.4 |   12.0   27.9 |    9.2   22.2 |  197.5   None | 0.00
```

## CRUSHER — b4-final

```
14 fights, start t1, set val_ext, enc CRUSHER
turn  n | incoming log/sim | through block log/sim | HP lost log/sim | enemy HP log/sim | sim fighting
   1  14 |   22.1   21.7 |    6.4    9.8 |    4.3    8.1 |  428.0   None | 1.00
   2  14 |   30.2   30.5 |   12.7   17.7 |   12.9   18.4 |  378.8  380.1 | 1.00
   3  14 |   18.1   18.3 |    4.7    7.0 |    5.0    7.8 |  338.1  337.3 | 1.00
   4  14 |   44.9   49.4 |   22.5   29.5 |   22.4   30.2 |  295.5  286.1 | 1.00
   5  12 |   22.2   21.3 |    7.6   10.0 |    6.5   10.1 |  253.8  244.2 | 0.80
   6   8 |   22.8   19.8 |   10.0   12.7 |    9.9   12.1 |  225.6  192.0 | 0.70
   7   7 |   35.1   28.2 |   11.5   17.4 |    9.4   17.5 |  208.4  161.1 | 0.40
   8   2 |   26.0    7.0 |   None   None |    7.5    2.3 |  119.0   65.8 | 0.30
```

## QUEEN — b4-base

```
9 fights, start t1, set val_ext, enc QUEEN
turn  n | incoming log/sim | through block log/sim | HP lost log/sim | enemy HP log/sim | sim fighting
   1   9 |   26.0   24.7 |    8.8   12.9 |    9.7   13.2 |  630.0   None | 1.00
   2   9 |   17.9   18.2 |    4.4    8.5 |    4.4    7.8 |  568.4   None | 1.00
   3   9 |   38.3   35.7 |   24.9   23.8 |   25.1   24.9 |  512.1   None | 1.00
   4   9 |   22.0   21.7 |    9.6   11.5 |    9.0   12.2 |  464.9   None | 1.00
   5   7 |   25.1   23.4 |    6.6   12.7 |    7.1   13.6 |  448.0   None | 0.90
   6   7 |   49.9   32.9 |   13.0   18.6 |   11.4   21.6 |  427.4   None | 0.70
   7   3 |   29.7   21.2 |    9.3    6.3 |    9.3    7.0 |  381.7   None | 0.40
   8   3 |   29.3   21.2 |    8.5    5.7 |   11.7    9.2 |  356.0   None | 0.30
   9   2 |   22.5   32.1 |    1.5   13.3 |    1.5   14.2 |  260.0   None | 0.30
  10   2 |   31.0   21.6 |    1.0    2.5 |    2.0    6.3 |  200.5   None | 0.10
  11   1 |    0.0   19.9 |   None   None |    0.0    4.4 |   78.0   None | 0.10
```

## QUEEN — b4-final

```
9 fights, start t1, set val_ext, enc QUEEN
turn  n | incoming log/sim | through block log/sim | HP lost log/sim | enemy HP log/sim | sim fighting
   1   9 |   26.0   24.7 |    8.8   12.9 |    9.7   13.2 |  630.0   None | 1.00
   2   9 |   17.9   18.2 |    4.4    8.5 |    4.4    7.8 |  568.4  563.5 | 1.00
   3   9 |   38.3   36.4 |   24.9   24.5 |   25.1   25.6 |  512.1  518.3 | 1.00
   4   9 |   22.0   22.1 |    9.6   11.7 |    9.0   12.6 |  464.9  477.1 | 1.00
   5   7 |   25.1   23.5 |    6.6   12.9 |    7.1   13.8 |  448.0  457.0 | 0.90
   6   7 |   49.9   44.9 |   13.0   30.4 |   11.4   33.3 |  427.4  426.4 | 0.60
   7   3 |   29.7   26.5 |    9.3   10.0 |    9.3   11.2 |  381.7  438.1 | 0.20
   8   3 |   29.3   27.5 |    8.5    8.3 |   11.7   15.3 |  356.0  422.8 | 0.10
   9   2 |   22.5   54.6 |    1.5   35.6 |    1.5   36.4 |  260.0  387.6 | 0.10
  10   2 |   31.0   41.2 |    1.0   25.0 |    2.0   22.0 |  200.5  359.2 | 0.00
```

## THE_INSATIABLE — b4-base

```
17 fights, start t1, set val_ext, enc THE_INSATIABLE
turn  n | incoming log/sim | through block log/sim | HP lost log/sim | enemy HP log/sim | sim fighting
   1  17 |    0.0    0.0 |    0.1    0.0 |    0.2    1.3 |  341.0   None | 1.00
   2  17 |   17.3   17.2 |    9.0    9.7 |    9.4   10.6 |  295.4   None | 1.00
   3  17 |   28.9   29.1 |   20.8   20.8 |   20.4   20.6 |  274.3   None | 1.00
   4  17 |    0.0    0.0 |    0.2    0.0 |    0.3    0.5 |  226.5   None | 1.00
   5  17 |   22.6   18.6 |   12.5   12.1 |   10.1   12.0 |  182.9   None | 1.00
   6  15 |   21.9   16.1 |    9.2    9.1 |    9.1    9.3 |  160.9   None | 0.90
   7  11 |   30.8   19.6 |   16.0   13.4 |   18.4   12.8 |  157.8   None | 0.60
   8   4 |    0.0    0.0 |    0.0    0.0 |    0.0    0.1 |  107.2   None | 0.10
   9   2 |   28.0   22.8 |   None   None |   12.0   15.1 |  128.5   None | 0.10
```

## THE_INSATIABLE — b4-final

```
17 fights, start t1, set val_ext, enc THE_INSATIABLE
turn  n | incoming log/sim | through block log/sim | HP lost log/sim | enemy HP log/sim | sim fighting
   1  17 |    0.0    0.0 |    0.1    0.0 |    0.2    1.3 |  341.0   None | 1.00
   2  17 |   17.3   17.2 |    9.0   10.2 |    9.4   11.0 |  295.4  290.2 | 1.00
   3  17 |   28.9   29.1 |   20.8   21.8 |   20.4   21.4 |  274.3  254.7 | 1.00
   4  17 |    0.0    0.0 |    0.2    0.0 |    0.3    0.5 |  226.5  211.9 | 1.00
   5  17 |   22.6   20.3 |   12.5   13.6 |   10.1   14.0 |  182.9  165.3 | 1.00
   6  15 |   21.9   18.7 |    9.2   11.4 |    9.1   11.6 |  160.9  133.8 | 0.90
   7  11 |   30.8   24.6 |   16.0   17.0 |   18.4   16.6 |  157.8  104.0 | 0.70
   8   4 |    0.0    0.0 |    0.0    0.0 |    0.0    0.3 |  107.2   87.4 | 0.20
   9   2 |   28.0   28.0 |   None   None |   12.0   23.8 |  128.5  144.3 | 0.00
```

## KNOWLEDGE_DEMON — b4-base

```
19 fights, start t1, set val_ext, enc KNOWLEDGE_DEMON
turn  n | incoming log/sim | through block log/sim | HP lost log/sim | enemy HP log/sim | sim fighting
   1  19 |    0.0    0.0 |    0.1    0.0 |    0.3    0.9 |  399.0   None | 1.00
   2  19 |   17.2   17.3 |    2.9    7.4 |    4.4    8.1 |  361.6   None | 1.00
   3  19 |   24.3   24.1 |   13.5   12.2 |   13.8   13.0 |  321.1   None | 1.00
   4  19 |   11.6   10.9 |    4.7    4.2 |    5.0    4.8 |  278.5   None | 1.00
   5  18 |    0.0    1.6 |    0.5    0.8 |    0.4    1.5 |  275.6   None | 1.00
   6  17 |   19.9   20.1 |    6.3   10.0 |    7.1   10.8 |  239.8   None | 1.00
   7  16 |   31.7   29.4 |   20.2   15.8 |   19.4   16.7 |  188.0   None | 1.00
   8  15 |   14.2   11.3 |    3.4    3.3 |    2.9    3.7 |  140.4   None | 0.90
   9  12 |    0.0    3.1 |    0.2    1.5 |    0.2    1.9 |  144.6   None | 0.90
  10   9 |   20.3   18.5 |    0.3    9.5 |    1.8    8.4 |  136.1   None | 0.70
  11   6 |   38.0   33.5 |    7.0   15.7 |   10.5   20.0 |  160.2   None | 0.80
  12   1 |   15.0   13.6 |    1.0    2.7 |    1.0    3.0 |  270.0   None | 0.90
```

## KNOWLEDGE_DEMON — b4-final

```
19 fights, start t1, set val_ext, enc KNOWLEDGE_DEMON
turn  n | incoming log/sim | through block log/sim | HP lost log/sim | enemy HP log/sim | sim fighting
   1  19 |    0.0    0.0 |    0.1    0.0 |    0.3    0.9 |  399.0   None | 1.00
   2  19 |   17.2   17.3 |    2.9    7.4 |    4.4    8.1 |  361.6  361.2 | 1.00
   3  19 |   24.3   24.1 |   13.5   12.2 |   13.8   13.0 |  321.1  327.4 | 1.00
   4  19 |   11.6   10.9 |    4.7    4.2 |    5.0    4.8 |  278.5  289.5 | 1.00
   5  18 |    0.0    1.6 |    0.5    0.8 |    0.4    1.5 |  275.6  262.3 | 1.00
   6  17 |   19.9   20.1 |    6.3   10.0 |    7.1   10.8 |  239.8  248.5 | 1.00
   7  16 |   31.7   29.4 |   20.2   15.8 |   19.4   16.7 |  188.0  204.9 | 1.00
   8  15 |   14.2   11.3 |    3.4    3.3 |    2.9    3.7 |  140.4  165.4 | 0.90
   9  12 |    0.0    3.1 |    0.2    1.5 |    0.2    1.9 |  144.6  139.3 | 0.90
  10   9 |   20.3   18.5 |    0.3    9.5 |    1.8    8.4 |  136.1  129.3 | 0.70
  11   6 |   38.0   33.5 |    7.0   15.7 |   10.5   20.0 |  160.2  137.9 | 0.80
  12   1 |   15.0   13.6 |    1.0    2.7 |    1.0    3.0 |  270.0  221.0 | 0.90
```

## CRUSHER (Kaiser Crab), turn-5 start, tune fights: after (b4-final) and with the policy threat term 2 (b4-tune-t2, not adopted)

```
27 fights, start t5, set tune, enc CRUSHER
turn  n | incoming log/sim | through block log/sim | HP lost log/sim | enemy HP log/sim | sim fighting
   1  27 |   20.1   20.1 |    6.5    7.0 |    6.8    5.1 |  275.9   None | 1.00
   2  26 |   21.5   20.5 |    6.1    9.3 |    6.2   10.6 |  246.8  241.2 | 1.00
   3  21 |   34.0   28.1 |    9.5   13.1 |    8.0   14.7 |  217.9  194.9 | 0.90
   4  13 |   25.1   18.9 |    3.2    4.5 |    2.8    4.5 |  182.1  148.4 | 0.80
   5  10 |   41.6   32.2 |   10.8   11.9 |    9.2   16.4 |  169.4  129.3 | 0.60
   6   4 |   23.5   15.1 |    5.5    3.4 |    3.0    4.2 |   92.0   69.2 | 0.70
   7   2 |   26.0   16.4 |    6.5    5.6 |    6.5    5.8 |  103.0   66.8 | 0.60
   8   2 |   34.5   17.2 |    4.5    8.4 |    4.5    8.7 |   72.0   46.2 | 0.30
```

```
27 fights, start t5, set tune, enc CRUSHER
turn  n | incoming log/sim | through block log/sim | HP lost log/sim | enemy HP log/sim | sim fighting
   1  27 |   20.1   20.1 |    6.5    5.6 |    6.8    3.6 |  275.9   None | 1.00
   2  26 |   21.5   21.2 |    6.1    6.2 |    6.2    7.6 |  246.8  245.2 | 1.00
   3  21 |   34.0   30.7 |    9.5   10.2 |    8.0   12.0 |  217.9  214.0 | 1.00
   4  13 |   25.1   21.1 |    3.2    3.0 |    2.8    3.3 |  182.1  177.8 | 0.90
   5  10 |   41.6   35.4 |   10.8   13.5 |    9.2   16.4 |  169.4  158.0 | 0.80
   6   4 |   23.5   20.3 |    5.5    3.0 |    3.0    4.0 |   92.0   95.5 | 0.80
   7   2 |   26.0   19.7 |    6.5    5.4 |    6.5    5.5 |  103.0   92.7 | 0.90
   8   2 |   34.5   23.0 |    4.5    9.5 |    4.5    9.6 |   72.0   71.8 | 0.60
```
