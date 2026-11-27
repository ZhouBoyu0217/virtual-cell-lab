"""
灰度视觉走查：把 L1/L3 截图转灰度，定位「最亮区域」，
用客观亮度数据验证：
  - L1：最亮 3 区域应是 培养皿 / 任务卡 / 开始按钮
  - L3：次要面板应比培养皿暗（"可见≠同权重"）

用法：
  python tests/gray-walkthrough.py _dev/qa-l1.png
  python tests/gray-walkthrough.py _dev/qa-l3.png

输出：按 8x8 网格统计平均亮度，打印 top 区域 + 关键区域亮度对比。
"""
import sys, os
from PIL import Image
import numpy as np

def lum(path):
    im = Image.open(path).convert('L')
    return im, np.asarray(im, dtype=np.float32)

def grid_means(a, gy=8, gx=8):
    H, W = a.shape
    cells = []
    for j in range(gy):
        for i in range(gx):
            y0, y1 = int(j * H / gy), int((j + 1) * H / gy)
            x0, x1 = int(i * W / gx), int((i + 1) * W / gx)
            cells.append(((i, j), float(a[y0:y1, x0:x1].mean())))
    return cells

def region_lum(a, x0f, y0f, x1f, y1f):
    H, W = a.shape
    return float(a[int(y0f*H):int(y1f*H), int(x0f*W):int(x1f*W)].mean())

def main():
    path = sys.argv[1]
    im, a = lum(path)
    H, W = a.shape
    print(f"=== 灰度走查: {path}  ({W}x{H}) ===")
    cells = grid_means(a)
    cells.sort(key=lambda c: -c[1])
    print("\n[最亮 6 个 8x8 网格单元]")
    for (i, j), v in cells[:6]:
        print(f"  格({i},{j}) x∈[{i*W//8},{ (i+1)*W//8}] y∈[{j*H//8},{(j+1)*H//8}]  平均亮度={v:.1f}")

    print("\n[关键区域平均亮度]")
    # 这些比例来自本项目 1500x1600 固定视口的已知布局
    regions = {
        '培养皿(canvas 区)':      (0.03, 0.03, 0.72, 0.32),
        '任务卡(mission)':        (0.03, 0.33, 0.62, 0.40),
        '开始按钮行(ctrls)':      (0.03, 0.42, 0.20, 0.46),
        '右栏·环境因子卡':        (0.76, 0.02, 1.00, 0.10),
        '右栏·预设卡':            (0.76, 0.01, 1.00, 0.06),
        '右栏·演化速度卡':        (0.76, 0.26, 1.00, 0.30),
        '右栏·局势卡':            (0.76, 0.32, 1.00, 0.38),
    }
    for name, (x0, y0, x1, y1) in regions.items():
        print(f"  {name:22s} = {region_lum(a, x0, y0, x1, y1):6.1f}")

    # 亮块判定
    dish = region_lum(a, 0.03, 0.03, 0.72, 0.32)
    right_panels = [region_lum(a, x0, y0, x1, y1) for (x0, y0, x1, y1) in [
        (0.76, 0.02, 1.00, 0.10), (0.76, 0.26, 1.00, 0.30), (0.76, 0.32, 1.00, 0.38)]]
    print(f"\n[结论] 培养皿亮度={dish:.1f}；右栏次要面板均值={np.mean(right_panels):.1f}；"
          f"培皿/面板 = {dish/max(1e-6,np.mean(right_panels)):.2f}x  "
          f"{'✓ 培养皿为唯一最亮块' if dish > np.mean(right_panels) * 1.3 else '⚠ 未显著更亮'}")

if __name__ == '__main__':
    main()
