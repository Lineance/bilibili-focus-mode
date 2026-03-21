use criterion::{black_box, criterion_group, criterion_main, Criterion};
use chromium_extension_monitor::config::Config;
use chromium_extension_monitor::extension::ExtensionDetector;
use chromium_extension_monitor::process::ProcessManager;

fn benchmark_extension_detection(c: &mut Criterion) {
    let mut detector = ExtensionDetector::new(vec![], vec!["test".to_string()]);
    
    c.bench_function("extension_detect_empty", |b| {
        b.iter(|| {
            detector.detect().ok();
        })
    });
}

fn benchmark_process_scan(c: &mut Criterion) {
    let mut manager = ProcessManager::new(vec!["notepad.exe".to_string()]);
    
    c.bench_function("process_scan", |b| {
        b.iter(|| {
            manager.get_target_processes();
        })
    });
}

fn benchmark_config_creation(c: &mut Criterion) {
    c.bench_function("config_default", |b| {
        b.iter(|| {
            Config::default();
        })
    });
}

criterion_group!(
    name = benches;
    config = Criterion::default().sample_size(10);
    targets = benchmark_extension_detection, benchmark_process_scan, benchmark_config_creation
);

criterion_main!(benches);
