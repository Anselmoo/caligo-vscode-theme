themes: 50

## (a) non-text contrast, floor 3.0 (WCAG 1.4.11)
| fg over surface | min | median | max | themes < 3.0 |
|---|---|---|---|---|
| focusBorder over sideBar.background | 3.04 | 7.03 | 9.24 | 0/50 |
| focusBorder over editor.background | 3.09 | 7.29 | 9.62 | 0/50 |
| focusBorder over panel.background | 3.04 | 7.03 | 9.24 | 0/50 |
| focusBorder over input.background | 2.97 | 6.75 | 8.87 | 2/50 |
| input.background over sideBar.background | 1.02 | 1.04 | 1.05 | 50/50 |
| input.border over input.background | 1.03 | 1.05 | 1.05 | 50/50 |
| input.border over sideBar.background | 1.06 | 1.10 | 1.10 | 50/50 |
| checkbox.border over sideBar.background | 1.06 | 1.10 | 1.10 | 50/50 |
| dropdown.border over sideBar.background | 1.06 | 1.10 | 1.10 | 50/50 |
| list.focusOutline over sideBar.background | 3.04 | 7.03 | 9.24 | 0/50 |
| list.focusAndSelectionOutline over sideBar.background>list.activeSelectionBackground | 2.20 | 3.78 | 5.01 | 5/50 |
| tab.activeBorder over editorGroupHeader.tabsBackground>tab.activeBackground | 3.09 | 7.29 | 9.62 | 0/50 |
| tab.activeBorder over editorGroupHeader.tabsBackground>tab.inactiveBackground | 3.04 | 7.03 | 9.24 | 0/50 |
| tab.activeBorderTop over editorGroupHeader.tabsBackground>tab.inactiveBackground | 3.04 | 7.03 | 9.24 | 0/50 |
| activityBar.activeBorder over activityBar.background | 3.04 | 7.03 | 9.24 | 0/50 |
| panelTitle.activeBorder over panel.background | 3.04 | 7.03 | 9.24 | 0/50 |
| statusBarItem.focusBorder over statusBar.background | 3.04 | 7.03 | 9.24 | 0/50 |
| editorWidget.border over editor.background | 1.07 | 1.13 | 1.15 | 50/50 |
| menu.selectionBorder over menu.background>menu.selectionBackground | 1.00 | 1.00 | 1.00 | 50/50 |
| inputOption.activeBorder over input.background | 2.97 | 6.75 | 8.87 | 2/50 |

## (b) state vs rest distance (WCAG ratio; OKLab dE x100)
| state | ratio min/med/max | dE min/med/max | themes dE < 2 | themes ratio < 1.05 | identical to rest |
|---|---|---|---|---|---|
| list hover vs sidebar | 1.01/1.03/1.03 | 1.21/1.28/1.41 | 50/50 | 50/50 | 0/50 |
| list selected(active) vs hover | 1.32/1.82/1.90 | 13.78/18.35/19.94 | 0/50 | 0/50 | 0/50 |
| list selected(inactive) vs sidebar | 1.15/1.42/1.47 | 9.82/12.62/13.79 | 0/50 | 0/50 | 0/50 |
| list focus vs sidebar | 1.08/1.25/1.33 | 6.51/9.29/10.99 | 0/50 | 0/50 | 0/50 |
| tab hover vs inactive | 1.02/1.04/1.04 | 1.84/2.07/2.25 | 25/50 | 50/50 | 0/50 |
| tab active vs inactive | 1.02/1.04/1.04 | 1.84/2.07/2.25 | 25/50 | 50/50 | 0/50 |
| statusBarItem hover vs statusBar | 1.02/1.03/1.04 | 1.57/1.66/1.84 | 50/50 | 50/50 | 0/50 |
| button hover vs rest | 1.00/1.20/1.31 | 0.00/5.90/8.52 | 8/50 | 7/50 | 3/50 |
| menu selection vs menu | 1.10/1.33/1.43 | 6.87/10.67/12.62 | 0/50 | 0/50 | 0/50 |
| quickInputList focus vs quickInput | 1.10/1.33/1.43 | 6.87/10.67/12.62 | 0/50 | 0/50 | 0/50 |
| toolbar hover vs sidebar | 1.06/1.19/1.25 | 5.40/7.62/9.05 | 0/50 | 0/50 | 0/50 |
| activityBar active vs rest | 1.04/1.15/1.20 | 4.63/6.41/7.64 | 0/50 | 2/50 | 0/50 |
